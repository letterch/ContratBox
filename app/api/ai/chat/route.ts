import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getMortgagePlan } from "@/lib/services/mortgage"
import { buildHouseholdCostInsights } from "@/lib/services/household-costs"
import { getAppFeatures } from "@/lib/services/feature-flags"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet"
const TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 30000)

type ChatBody = {
  message?: string
  activeContractId?: string | null
}

function buildDefaultSystemPrompt() {
  return `Tu es l'assistant ContratBox, expert des contrats suisses (assurances, télécom, énergie, hypothèques, bail locatif, leasing, abonnements).
Objectif:
- Répondre précisément à partir des contrats du ménage.
- Expliquer clairement les couvertures, exclusions, clauses de résiliation et échéances.
- Sur les hypothèques: calculer intérêts estimés, amortissement direct/indirect, coûts par tranche.
- Sur les baux: expliquer loyer/charges, reconduction tacite, fenêtre de résiliation.
- Proposer des pistes d'économies chiffrées quand possible.
- Si une information manque, le dire explicitement et proposer quoi vérifier.
- Ne jamais inventer de données non présentes.
- Structurer les réponses en français, de façon courte et actionnable.`
}

function buildContractsContext(contracts: Array<Record<string, unknown>>, leaseInsightsEnabled: boolean) {
  const lines = contracts.map((c, i) => {
    const title = String(c.title ?? c.provider ?? c.contractType ?? "Contrat")
    const provider = c.provider ? `Prestataire: ${String(c.provider)}` : ""
    const category = c.category ? `Catégorie: ${String(c.category)}` : ""
    const premium = c.premiumAmount ? `Prime: CHF ${String(c.premiumAmount)}/${String(c.premiumFrequency ?? "mois")}` : ""
    const startDate = c.startDate ? `Début: ${new Date(String(c.startDate)).toISOString().slice(0, 10)}` : ""
    const renewalDate = c.renewalDate ? `Renouvellement: ${new Date(String(c.renewalDate)).toISOString().slice(0, 10)}` : ""
    const notice = c.cancellationNoticeDays ? `Préavis: ${String(c.cancellationNoticeDays)} jours` : ""
    const coverage = c.coverageSummary ? `Couverture: ${String(c.coverageSummary)}` : ""
    const exclusions = c.exclusions ? `Exclusions: ${String(c.exclusions)}` : ""
    const clauses = c.importantClauses ? `Clauses importantes: ${String(c.importantClauses)}` : ""
    const raw = c.rawExtraction && typeof c.rawExtraction === "object"
      ? (c.rawExtraction as Record<string, unknown>)
      : {}
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
      notice,
      coverage,
      exclusions,
      clauses,
      leaseContext,
      mortgageContext,
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
  if (!message) {
    return NextResponse.json({ error: "Message vide" }, { status: 400 })
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
          cancellationNoticeDays: true,
          maturityDate: true,
          mortgageRate: true,
          coverageSummary: true,
          exclusions: true,
          importantClauses: true,
          rawExtraction: true,
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

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000",
        "X-Title": "ContratBox Assistant",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "system",
            content:
              "Contexte contrats utilisateur (source interne ContratBox) :\n" +
              (contractsContext || "Aucun contrat disponible."),
          },
          ...(features.globalSavingsAssistantEnabled
            ? [
                {
                  role: "system" as const,
                  content:
                    `Vue coûts ménage: CHF ${Math.round(costInsights.monthlyTotal)} / mois, CHF ${Math.round(costInsights.annualTotal)} / an.\n` +
                    `Suggestions automatiques: ${costInsights.suggestions.join(" | ")}`,
                },
              ]
            : []),
          { role: "user", content: message },
        ],
      }),
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

    return NextResponse.json({ answer, sources })
  } catch (error) {
    console.error("[ai-chat] error", error)
    return NextResponse.json({ error: "Échec de génération IA" }, { status: 500 })
  } finally {
    clearTimeout(timeout)
  }
}
