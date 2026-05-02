import { buildContractCancellationNextLetterUrl } from "@/lib/services/nextletter"
import type { CostInsights } from "@/lib/services/household-costs"
import { analyzeMortgageContractDecision } from "@/lib/services/mortgage-recommendation"
import { buildContractTriggerEvents, type ContractForTriggers, type ContractTriggerEvent } from "@/lib/services/trigger-engine"
import type { DecisionUrgencyLevel } from "@/lib/types/contract-decision"

export type ActionableRecommendation = {
  id: string
  title: string
  impactChfYear: number
  urgency: DecisionUrgencyLevel
  priorityScore: number
  ctaLabel: string
  ctaHref: string
  subtitle?: string
}

type ContractRow = ContractForTriggers

function urgencyScore(u: DecisionUrgencyLevel): number {
  if (u === "high") return 55
  if (u === "medium") return 35
  return 18
}

/** Score 0–100 : urgence + impact financier + proximité temporelle */
export function computePriorityScore(input: {
  urgency: DecisionUrgencyLevel
  impactChfYear: number
  daysUntil: number
}): number {
  let score = urgencyScore(input.urgency)
  score += Math.min(30, Math.round((input.impactChfYear / 1200) * 10))
  if (input.daysUntil <= 14) score += 12
  else if (input.daysUntil <= 30) score += 6
  return Math.min(100, Math.max(0, score))
}

function triggerToAction(ev: ContractTriggerEvent, contract?: ContractRow): ActionableRecommendation {
  const impact = Math.max(0, ev.estimatedImpactChfYear)
  const priorityScore = computePriorityScore({
    urgency: ev.urgency,
    impactChfYear: impact,
    daysUntil: ev.daysUntil,
  })

  const ctaHref =
    ev.kind === "cancellation_window"
      ? buildContractCancellationNextLetterUrl({
          provider: ev.provider ?? contract?.provider,
          policyNumber: contract?.policyNumber ?? null,
          contractTitle: ev.title,
          category: ev.category ?? contract?.category ?? null,
          noticeDays: contract?.cancellationNoticeDays ?? null,
          renewalDateIso: contract?.renewalDate
            ? new Date(contract.renewalDate).toISOString().slice(0, 10)
            : null,
          extraContext: ev.description,
        })
      : `/contracts/${ev.contractId}`

  const ctaLabel =
    ev.kind === "cancellation_window" ? "Générer la lettre avec NextLetter" : "Voir le contrat"

  return {
    id: ev.id,
    title: ev.title,
    impactChfYear: impact,
    urgency: ev.urgency,
    priorityScore,
    ctaLabel,
    ctaHref,
    subtitle: ev.description,
  }
}

function costInsightsToActions(insights: CostInsights): ActionableRecommendation[] {
  return insights.actionPlan
    .filter((a) => a.priority === "high" || a.priority === "medium")
    .map((a) => {
      const impact = (a.impactMonthly ?? 0) * 12
      const urgency: DecisionUrgencyLevel = a.priority === "high" ? "high" : "medium"
      const priorityScore = computePriorityScore({
        urgency,
        impactChfYear: impact,
        daysUntil: 45,
      })
      return {
        id: `cost-${a.id}`,
        title: a.title,
        impactChfYear: Math.round(impact),
        urgency,
        priorityScore,
        ctaLabel: "Ouvrir le tableau de bord",
        ctaHref: "/dashboard",
        subtitle: "Optimisation globale du ménage",
      } satisfies ActionableRecommendation
    })
}

/**
 * Fusionne triggers, hypothèques et pistes coûts ; retourne les 3 actions les plus prioritaires.
 */
export function buildTopActionableRecommendations(
  contracts: ContractRow[],
  costInsights: CostInsights | null
): ActionableRecommendation[] {
  const triggers = buildContractTriggerEvents(contracts)
  const byContractId = new Map(contracts.map((c) => [c.id, c]))
  const fromTriggers = triggers.map((ev) => triggerToAction(ev, byContractId.get(ev.contractId)))

  const mortgageActions: ActionableRecommendation[] = []
  for (const c of contracts) {
    if (c.category !== "mortgage") continue
    const m = analyzeMortgageContractDecision(c)
    if (!m || m.recommendation !== "renegotiate") continue
    const urgency: DecisionUrgencyLevel =
      m.expiresInDays <= 90 ? "high" : m.expiresInDays <= 180 ? "medium" : "low"
    mortgageActions.push({
      id: `mortgage-decision-${c.id}`,
      title: `${c.provider ?? "Hypothèque"} — renégociation`,
      impactChfYear: m.savingsPotential,
      urgency,
      priorityScore: computePriorityScore({
        urgency,
        impactChfYear: m.savingsPotential,
        daysUntil: Math.min(m.expiresInDays, 365),
      }),
      ctaLabel: "Voir l’hypothèque",
      ctaHref: `/contracts/${c.id}`,
      subtitle: `Échéance dans ${m.expiresInDays === 9999 ? "?" : `${m.expiresInDays} j.`} · potentiel d’économie intérêts`,
    })
  }

  const fromCosts = costInsights ? costInsightsToActions(costInsights) : []

  const merged = [...fromTriggers, ...mortgageActions, ...fromCosts]
  const byId = new Map<string, ActionableRecommendation>()
  for (const item of merged.sort((a, b) => b.priorityScore - a.priorityScore)) {
    if (!byId.has(item.id)) byId.set(item.id, item)
  }
  return Array.from(byId.values())
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 3)
}

export type NextStepBannerPayload = {
  title: string
  subtitle: string
  impactChfYear: number
  ctaLabel: string
  ctaHref: string
} | null

export function buildNextStepBanner(top: ActionableRecommendation[]): NextStepBannerPayload {
  const first = top[0]
  if (!first) return null
  return {
    title: first.title,
    subtitle: first.subtitle ?? "Agir maintenant maximise les économies.",
    impactChfYear: first.impactChfYear,
    ctaLabel: first.ctaLabel,
    ctaHref: first.ctaHref,
  }
}
