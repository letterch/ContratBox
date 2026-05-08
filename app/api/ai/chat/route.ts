import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getMortgagePlan } from "@/lib/services/mortgage"
import { buildHouseholdCostInsights } from "@/lib/services/household-costs"
import { getAppFeatures } from "@/lib/services/feature-flags"
import {
  AGENT_ACTION_ROADMAP,
  buildAiAttachmentsContextBlock,
  buildContractDocumentContextBlock,
} from "@/lib/services/document-knowledge"
import {
  assistantReplyLanguageInstruction,
  detectAssistantReplyLanguage,
} from "@/lib/services/ai-chat-language"
import {
  buildOpenRouterChatCompletionBody,
  OPENROUTER_CHAT_COMPLETIONS_URL,
} from "@/lib/services/openrouter-models"
import {
  getAccessContextForUser,
  accessCanUseModule,
  accessCanAskAi,
  accessAiQuotaRemaining,
} from "@/lib/services/access-context"
import { incrementAiUsage } from "@/lib/services/ai-usage"

const TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 60000)

type ChatBody = {
  message?: string
  activeContractId?: string | null
  /** Imports IA (/api/ai/attachments) à inclure dans le contexte pour cette question */
  attachmentIds?: string[] | null
}

function buildDefaultSystemPrompt() {
  return `Tu es l'assistant ContratBox, expert des contrats suisses (assurances, télécom, énergie, hypothèques, bail locatif, leasing, abonnements).
Objectif:
- Répondre précisément à partir des contrats du ménage (champs structurés + extraits de document quand fournis).
- Répondre aussi à partir des « Imports IA » : fichiers PDF/images que l'utilisateur a déposés dans l'assistant (offres commerciales, projets de police, anciennes polices non encore enregistrées comme contrats). Distinction importante : une offre ou une proposition peut différer de la police définitive ; le préciser si pertinent.
- Expliquer clairement les couvertures, exclusions, clauses de résiliation et échéances.
- Sur les hypothèques: calculer intérêts estimés, amortissement direct/indirect, coûts par tranche.
- Sur les baux: expliquer loyer/charges, reconduction tacite, fenêtre de résiliation.
- Proposer des pistes d'économies chiffrées quand possible.
- Proposer des prochaines étapes concrètes (ex. vérifier une date, comparer une prime, préparer une résiliation) sans prétendre qu'une action a déjà été exécutée dans l'app sauf si c'est explicitement le cas.
- Si une information manque, le dire explicitement et proposer quoi vérifier.
- Ne jamais inventer de données non présentes.
- Répondre dans la langue de la question de l'utilisateur (français, italien, anglais, allemand, portugais, espagnol, turc ou albanais / Shqip selon la langue détectée).
- Pour les demandes de synthèse multilingue sur un même document : respecter strictement les langues demandées ; « Shqip » désigne l'albanais (code linguistique SQ).
- Structurer les réponses de façon courte et actionnable.
- Feuille de route actions produit (pour formulations alignées, pas d'exécution implicite): ${AGENT_ACTION_ROADMAP.join(", ")}.`
}

function buildContractsContext(contracts: Array<Record<string, unknown>>, leaseInsightsEnabled: boolean) {
  const lines = contracts.map((c, i) => {
    const title = String(c.title ?? c.provider ?? c.contractType ?? "Contrat")
    const provider = c.provider ? `Prestataire: ${String(c.provider)}` : ""
    const category = c.category ? `Catégorie: ${String(c.category)}` : ""
    const premium = c.premiumAmount ? `Prime: CHF ${String(c.premiumAmount)}/${String(c.premiumFrequency ?? "mois")}` : ""
    const startDate = c.startDate ? `Début: ${new Date(String(c.startDate)).toISOString().slice(0, 10)}` : ""
    const renewalDate = c.renewalDate ? `Renouvellement: ${new Date(String(c.renewalDate)).toISOString().slice(0, 10)}` : ""
    const endDate = c.endDate ? `Fin: ${new Date(String(c.endDate)).toISOString().slice(0, 10)}` : ""
    const maturityDate = c.maturityDate ? `Maturité: ${new Date(String(c.maturityDate)).toISOString().slice(0, 10)}` : ""
    const cancellationDeadline = c.cancellationDeadline ? `Délai de résiliation: ${new Date(String(c.cancellationDeadline)).toISOString().slice(0, 10)}` : ""
    const notice = c.cancellationNoticeDays ? `Préavis: ${String(c.cancellationNoticeDays)} jours` : ""
    const coverage = c.coverageSummary ? `Couverture: ${String(c.coverageSummary)}` : ""
    const exclusions = c.exclusions ? `Exclusions: ${String(c.exclusions)}` : ""
    const clauses = c.importantClauses ? `Clauses importantes: ${String(c.importantClauses)}` : ""
    const raw = c.rawExtraction && typeof c.rawExtraction === "object"
      ? (c.rawExtraction as Record<string, unknown>)
      : {}
    const docBlock =
      typeof c.extractedText === "string" && c.extractedText.trim().length > 0
        ? `\n${buildContractDocumentContextBlock(c.extractedText, raw.documentTextMeta)}`
        : ""
    const leaseContext =
      leaseInsightsEnabled && c.category === "rent_lease"
        ? [
            raw.leaseMonthlyRent ? `Loyer mensuel: CHF ${String(raw.leaseMonthlyRent)}` : "",
            raw.leaseMonthlyCharges ? `Charges mensuelles: CHF ${String(raw.leaseMonthlyCharges)}` : "",
            raw.leaseTacitRenewal != null ? `Reconduction tacite: ${raw.leaseTacitRenewal ? "oui" : "non"}` : "",
            raw.leaseEndDate ? `Échéance bail: ${String(raw.leaseEndDate)}` : "",
          ]
            .filter(Boolean)
            .join("\n")
        : ""
    const mortgagePlan = getMortgagePlan({
      id: String(c.id),
      provider: c.provider as string | null,
      startDate: c.startDate as Date | null,
      maturityDate: c.maturityDate as Date | null,
      mortgageRate: c.mortgageRate as number | null,
      rawExtraction: c.rawExtraction,
    })
    const mortgageContext = mortgagePlan.isMortgage
      ? [
          `Hypothèque: capital total CHF ${Math.round(mortgagePlan.principalTotal).toLocaleString("fr-CH")}`,
          `Intérêts estimés CHF ${Math.round(mortgagePlan.totalInterestEstimate).toLocaleString("fr-CH")}`,
          `Amortissement estimé CHF ${Math.round(mortgagePlan.totalAmortizationEstimate).toLocaleString("fr-CH")}`,
          `Tranches: ${mortgagePlan.tranches
            .map(
              (t) =>
                `${t.name} (${t.annualRate.toFixed(2)}%, ${t.durationMonths} mois, ${t.daysToMaturity ?? "?"}j restants, ${t.amortizationType})`
            )
            .join(" ; ")}`,
        ].join("\n")
      : ""
    return [
      `#${i + 1} [${String(c.id)}] ${title}`,
      provider,
      category,
      premium,
      startDate,
      renewalDate,
      endDate,
      maturityDate,
      cancellationDeadline,
      notice,
      coverage,
      exclusions,
      clauses,
      leaseContext,
      mortgageContext,
      docBlock,
    ]
      .filter(Boolean)
      .join("\n")
  })
  return lines.join("\n\n").slice(0, 16000)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const body = (await request.json()) as ChatBody
  const features = await getAppFeatures()
  const message = body.message?.trim()
  const detectedLanguage = detectAssistantReplyLanguage(message ?? "")
  if (!message) {
    return NextResponse.json({ error: "Message vide" }, { status: 400 })
  }

  // Gating module + quota mensuel (5 questions / mois en plan free).
  const access = await getAccessContextForUser(session.user.id, session)
  if (!access) {
    return NextResponse.json({ error: "Contexte d'accès indisponible" }, { status: 403 })
  }
  if (!accessCanUseModule(access, "module_ai_chat")) {
    return NextResponse.json(
      { error: "Module assistant non disponible pour votre plan." },
      { status: 403 }
    )
  }
  if (!accessCanAskAi(access)) {
    const remaining = accessAiQuotaRemaining(access) ?? 0
    return NextResponse.json(
      {
        error: "Quota mensuel de questions atteint.",
        code: "ai_quota_exceeded",
        remaining,
        limit: access.entitlements.quotas.maxAiQuestionsPerMonth,
        used: access.aiUsage.questionsUsed,
      },
      { status: 402 }
    )
  }

  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
    include: {
      contracts: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          provider: true,
          contractType: true,
          category: true,
          premiumAmount: true,
          premiumFrequency: true,
          startDate: true,
          renewalDate: true,
          endDate: true,
          cancellationNoticeDays: true,
          cancellationDeadline: true,
          maturityDate: true,
          mortgageRate: true,
          coverageSummary: true,
          exclusions: true,
          importantClauses: true,
          rawExtraction: true,
          extractedText: true,
        },
      },
    },
  })

  const allContracts = household?.contracts ?? []
  const prioritized = body.activeContractId
    ? allContracts.filter((c) => c.id === body.activeContractId)
    : []
  const otherContracts = allContracts.filter((c) => c.id !== body.activeContractId)
  const contractsForContext = [...prioritized, ...otherContracts].slice(0, 20)
  const costInsights = buildHouseholdCostInsights(
    contractsForContext.map((c) => ({
      id: c.id,
      provider: c.provider,
      category: c.category,
      premiumAmount: c.premiumAmount,
      premiumFrequency: c.premiumFrequency,
      rawExtraction: c.rawExtraction,
    }))
  )

  const template = await prisma.promptTemplate.findFirst({
    where: { key: "assistant_system", isActive: true },
    orderBy: { version: "desc" },
  })
  const systemPrompt = template?.content?.trim() || buildDefaultSystemPrompt()
  const contractsContext = buildContractsContext(
    contractsForContext as unknown as Array<Record<string, unknown>>,
    features.leaseInsightsEnabled
  )

  const attachmentIdList = Array.from(
    new Set((body.attachmentIds ?? []).filter((id): id is string => typeof id === "string" && id.length > 0))
  ).slice(0, 8)

  let attachmentsContext = ""
  if (attachmentIdList.length > 0 && household) {
    const attachments = await prisma.aiAssistantAttachment.findMany({
      where: {
        householdId: household.id,
        id: { in: attachmentIdList },
      },
      select: {
        id: true,
        label: true,
        kind: true,
        extractedText: true,
        textExtractionMeta: true,
      },
    })
    const ordered = attachmentIdList
      .map((id) => attachments.find((a) => a.id === id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
    attachmentsContext = buildAiAttachmentsContextBlock(ordered)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000",
        "X-Title": "ContratBox Assistant",
      },
      body: JSON.stringify(
        buildOpenRouterChatCompletionBody({
          temperature: 0.2,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "system",
              content:
                "Contexte contrats utilisateur (source interne ContratBox) :\n" +
                (contractsContext || "Aucun contrat disponible."),
            },
            ...(attachmentsContext
              ? [
                  {
                    role: "system",
                    content:
                      "Imports IA — documents déposés dans le chat (texte extrait). Types indiqués par kind : proposal (offre/projet), policy (police/titre), other.\n" +
                      attachmentsContext,
                  },
                ]
              : []),
            {
              role: "system",
              content: assistantReplyLanguageInstruction(detectedLanguage),
            },
            ...(features.globalSavingsAssistantEnabled
              ? [
                  {
                    role: "system",
                    content:
                      `Vue coûts ménage: CHF ${Math.round(costInsights.monthlyTotal)} / mois, CHF ${Math.round(costInsights.annualTotal)} / an.\n` +
                      `Suggestions automatiques: ${costInsights.suggestions.join(" | ")}`,
                  },
                ]
              : []),
            { role: "user", content: message },
          ],
        })
      ),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[ai-chat] OpenRouter error", { status: res.status, text })
      return NextResponse.json({ error: "Erreur IA fournisseur" }, { status: 502 })
    }

    const data = await res.json()
    const answer = String(data?.choices?.[0]?.message?.content ?? "").trim()
    if (!answer) {
      return NextResponse.json({ error: "Réponse IA vide" }, { status: 502 })
    }

    const sources = contractsForContext.slice(0, 3).map((c) => c.title || c.provider || c.contractType || c.id)
    const attachmentSources =
      attachmentIdList.length > 0 && household
        ? (
            await prisma.aiAssistantAttachment.findMany({
              where: { householdId: household.id, id: { in: attachmentIdList } },
              select: { label: true },
            })
          ).map((a) => `Import : ${a.label}`)
        : []

    // Décompte une question réussie (réponse IA non vide) — pas en cas d'erreur.
    let aiUsageAfter: number | null = null
    try {
      aiUsageAfter = await incrementAiUsage(session.user.id, 1)
    } catch (err) {
      console.error("[ai-chat] incrementAiUsage failed", err)
    }
    const limit = access.entitlements.quotas.maxAiQuestionsPerMonth
    return NextResponse.json({
      answer,
      sources: [...attachmentSources, ...sources].slice(0, 8),
      quota:
        limit == null
          ? { limit: null, used: aiUsageAfter ?? access.aiUsage.questionsUsed + 1, remaining: null }
          : {
              limit,
              used: aiUsageAfter ?? access.aiUsage.questionsUsed + 1,
              remaining: Math.max(0, limit - (aiUsageAfter ?? access.aiUsage.questionsUsed + 1)),
            },
    })
  } catch (error) {
    console.error("[ai-chat] error", error)
    return NextResponse.json({ error: "Échec de génération IA" }, { status: 500 })
  } finally {
    clearTimeout(timeout)
  }
}
