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
import { SWISS_INSURANCE_BENCHMARK } from "@/lib/config/swiss-insurance-benchmark"

const TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 60000)

type ChatBody = {
  message?: string
  activeContractId?: string | null
  /** Imports IA (/api/ai/attachments) à inclure dans le contexte pour cette question */
  attachmentIds?: string[] | null
  /** Thread ID for conversation continuity — omit to start a new thread */
  threadId?: string | null
}

const MAX_HISTORY_MESSAGES = 10

function buildDefaultSystemPrompt() {
  return `Tu es l'assistant ContratBox, expert des contrats suisses (assurances, télécom, énergie, hypothèques, bail locatif, leasing, abonnements) et conseiller en optimisation des dépenses du ménage.

## Sources de données
Tu disposes de DEUX types de documents à analyser :
1. **Contrats enregistrés** (section « Contexte contrats ») : les contrats déjà saisis dans ContratBox avec leurs champs structurés + texte extrait.
2. **Imports IA** (section « Imports IA ») : fichiers PDF/images que l'utilisateur a déposés dans l'assistant — polices, offres commerciales, propositions, conditions générales, anciennes polices. TOUJOURS les lire et les analyser quand ils sont fournis, même s'ils ne sont pas enregistrés comme contrats.

## Analyse de polices et propositions d'assurance
Quand l'utilisateur dépose un document (police ou proposition), fournir SYSTÉMATIQUEMENT :

### Résumé structuré
- **Assureur** et numéro de police
- **Type** (RC ménage, complémentaire, auto, vie, bâtiment…)
- **Dates** : début, fin, renouvellement, préavis de résiliation
- **Prime** : montant, fréquence (mensuelle/annuelle), franchise / participation
- **Somme assurée** et valeur à neuf vs valeur vénale
- **Couvertures incluses** : lister chaque risque couvert avec les limites
- **Exclusions** : lister les exclusions importantes
- **Clauses spéciales** : dérogations, avenants, conditions particulières

### Comparaison marché suisse
Comparer avec les fourchettes de prix du marché suisse :
${SWISS_INSURANCE_BENCHMARK}
Indiquer clairement si la prime est dans la fourchette basse, moyenne ou haute.
Mentionner 2-3 assureurs concurrents qui couvrent des risques similaires en Suisse.

### Recommandation
- Le contrat/offre est-il compétitif ?
- Y a-t-il des lacunes de couverture ou des doublons avec d'autres contrats du ménage ?
- Actions concrètes : garder, renégocier, résilier, compléter ?

## Comparaison entre documents
Si l'utilisateur a importé PLUSIEURS documents (ex. une police actuelle + une offre concurrente), produire un tableau comparatif :
| Critère | Document A | Document B |
(couvertures, primes, franchises, exclusions, durée, préavis)
Conclure avec une recommandation argumentée.

## Règles générales
- Expliquer clairement les couvertures, exclusions, clauses de résiliation et échéances.
- Sur les hypothèques : calculer intérêts estimés, amortissement direct/indirect, coûts par tranche.
- Sur les baux : expliquer loyer/charges, reconduction tacite, fenêtre de résiliation.
- Proposer des pistes d'économies chiffrées quand possible.
- Proposer des prochaines étapes concrètes sans prétendre qu'une action a été exécutée.
- Si une information manque, le dire explicitement et proposer quoi vérifier.
- Ne jamais inventer de données non présentes dans les documents fournis.
- Répondre dans la langue de la question (FR, IT, EN, DE, PT, ES, TR, albanais/Shqip).
- Pour les synthèses multilingues : respecter strictement les langues demandées.
- Structurer les réponses de façon claire avec des sections, listes et tableaux.
- Feuille de route actions produit (formulations alignées, pas d'exécution implicite) : ${AGENT_ACTION_ROADMAP.join(", ")}.`
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
  return lines.join("\n\n").slice(0, 24000)
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

  // --- Historique de conversation (thread) ---
  let threadId = body.threadId ?? null
  let historyMessages: Array<{ role: string; content: string }> = []

  if (threadId) {
    const thread = await prisma.aIChatThread.findFirst({
      where: { id: threadId, userId: session.user.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: MAX_HISTORY_MESSAGES * 2,
          select: { role: true, content: true },
        },
      },
    })
    if (thread) {
      historyMessages = thread.messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-(MAX_HISTORY_MESSAGES * 2))
    } else {
      threadId = null
    }
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
            ...historyMessages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
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

    // --- Persist thread + messages ---
    try {
      if (!threadId) {
        const newThread = await prisma.aIChatThread.create({
          data: {
            userId: session.user.id,
            householdId: household?.id ?? null,
            title: message.slice(0, 80),
          },
        })
        threadId = newThread.id
      } else {
        await prisma.aIChatThread.update({
          where: { id: threadId },
          data: { updatedAt: new Date() },
        })
      }
      await prisma.aIChatMessage.createMany({
        data: [
          { threadId, role: "user", content: message, sources: [] },
          {
            threadId,
            role: "assistant",
            content: answer,
            sources: [...attachmentSources, ...sources].slice(0, 8),
          },
        ],
      })
    } catch (err) {
      console.error("[ai-chat] thread persistence failed (non-blocking)", err)
    }

    const limit = access.entitlements.quotas.maxAiQuestionsPerMonth
    return NextResponse.json({
      answer,
      sources: [...attachmentSources, ...sources].slice(0, 8),
      threadId,
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
