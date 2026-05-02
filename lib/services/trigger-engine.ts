import { startOfDay } from "date-fns"
import { calculateCancellationDeadline } from "@/lib/services/contract-deadline"
import { getKeyDateFromContractLike } from "@/lib/services/contract-key-date"
import { getMortgageMarketBenchmarkRatePct } from "@/lib/services/mortgage-benchmark"
import { getMortgagePlan, type ContractLike } from "@/lib/services/mortgage"

export type RenewalWindowBucket = "60" | "30" | "7"

export type TriggerKind = "renewal_soon" | "mortgage_maturity" | "cancellation_window"

export type DecisionUrgency = "low" | "medium" | "high"

export type ContractTriggerEvent = {
  id: string
  kind: TriggerKind
  contractId: string
  provider: string | null
  category: string | null
  daysUntil: number
  /** Date d’échéance / fin de fenêtre (jour calendaire) — pour Reminder.dueDate */
  dueAt: Date
  /** Présent pour renouvellement / échéance calendaire */
  windowBucket?: RenewalWindowBucket
  title: string
  description: string
  recommendedAction: string
  urgency: DecisionUrgency
  /** CHF/an indicatif pour le tri (0 si inconnu) */
  estimatedImpactChfYear: number
}

export type ContractForTriggers = ContractLike & {
  id: string
  category?: string | null
  provider?: string | null
  policyNumber?: string | null
  status?: string | null
  premiumAmount?: unknown
  premiumFrequency?: string | null
  renewalDate?: Date | string | null
  cancellationDeadline?: Date | string | null
  cancellationNoticeDays?: number | null
  rawExtraction?: unknown
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
}

function renewalWindowBucket(days: number): RenewalWindowBucket | null {
  if (days < 0 || days > 60) return null
  if (days <= 7) return "7"
  if (days <= 30) return "30"
  return "60"
}

function urgencyFromDays(days: number, kind: TriggerKind): DecisionUrgency {
  if (kind === "cancellation_window") {
    if (days <= 7) return "high"
    if (days <= 21) return "medium"
    return "low"
  }
  if (days <= 7) return "high"
  if (days <= 30) return "medium"
  return "low"
}

function deriveCancellationDeadline(contract: ContractForTriggers): Date | null {
  if (contract.cancellationDeadline) {
    const d = new Date(contract.cancellationDeadline)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const keyDate = getKeyDateFromContractLike(contract)
  const raw = (contract.rawExtraction ?? {}) as Record<string, unknown>
  const rawNoticeValue = Number(raw.cancellationNoticeValue)
  const rawNoticeUnit = raw.cancellationNoticeUnit as "days" | "months" | "years" | null
  return calculateCancellationDeadline(
    keyDate,
    contract.cancellationNoticeDays ?? null,
    Number.isFinite(rawNoticeValue) ? rawNoticeValue : null,
    rawNoticeUnit
  )
}

/** Prime mensuelle approximative pour estimer l’impact d’une résiliation */
function monthlyPremiumChf(contract: ContractForTriggers): number {
  const raw = (contract.rawExtraction ?? {}) as Record<string, unknown>
  const fromRaw = Number(raw.monthlyPremium ?? raw.premiumMonthly)
  if (Number.isFinite(fromRaw) && fromRaw > 0) return fromRaw
  const p = contract.premiumAmount
  let amount = 0
  if (p && typeof p === "object" && "toNumber" in p) amount = (p as { toNumber: () => number }).toNumber()
  else if (typeof p === "number") amount = p
  else if (typeof p === "string") amount = Number(p.replace(",", ".")) || 0
  const freq = (contract as { premiumFrequency?: string | null }).premiumFrequency
  if (amount <= 0) return 0
  if (freq === "annual") return amount / 12
  return amount
}

/**
 * Détecte renouvellements (60 / 30 / 7 j), échéances hypothécaires et fenêtres de résiliation.
 * À utiliser pour alertes dashboard, notifications futures et moteur de recommandations.
 */
export function buildContractTriggerEvents(contracts: ContractForTriggers[], now = new Date()): ContractTriggerEvent[] {
  const events: ContractTriggerEvent[] = []

  for (const c of contracts) {
    if (String(c.status ?? "active") === "cancelled") continue

    const cancelDeadline = deriveCancellationDeadline(c)
    if (cancelDeadline && cancelDeadline >= now) {
      const daysUntil = daysBetween(now, cancelDeadline)
      if (daysUntil <= 60) {
        const monthly = monthlyPremiumChf(c)
        const impact = monthly > 0 ? Math.round(monthly * 12) : 0
        events.push({
          id: `${c.id}-cancellation-${cancelDeadline.toISOString().slice(0, 10)}`,
          kind: "cancellation_window",
          contractId: c.id,
          provider: c.provider ?? null,
          category: c.category ?? null,
          daysUntil,
          dueAt: startOfDay(cancelDeadline),
          title: c.provider ?? "Contrat",
          description: `Délai de résiliation dans ${daysUntil} j. Sans action, renouvellement probable.`,
          recommendedAction: "Envoyer une résiliation ou renégocier avant la date limite.",
          urgency: urgencyFromDays(daysUntil, "cancellation_window"),
          estimatedImpactChfYear: impact,
        })
      }
    }

    if (c.category === "mortgage") {
      const plan = getMortgagePlan(c)
      if (plan.isMortgage) {
        for (const t of plan.tranches) {
          if (!t.endDate || t.daysToMaturity == null) continue
          if (t.daysToMaturity < 0 || t.daysToMaturity > 180) continue
          const bucket = renewalWindowBucket(t.daysToMaturity)
          events.push({
            id: `${c.id}-mortgage-${t.name}-${t.endDate.toISOString().slice(0, 10)}`,
            kind: "mortgage_maturity",
            contractId: c.id,
            provider: c.provider ?? null,
            category: c.category,
            daysUntil: t.daysToMaturity,
            dueAt: startOfDay(t.endDate),
            windowBucket: bucket ?? undefined,
            title: `${c.provider ?? "Hypothèque"} — ${t.name}`,
            description: `Échéance de tranche dans ${t.daysToMaturity} j. (taux ${t.annualRate.toFixed(2)} %).`,
            recommendedAction: "Comparer au marché et renégocier / faire une offre de refinancement.",
            urgency: urgencyFromDays(t.daysToMaturity, "mortgage_maturity"),
            estimatedImpactChfYear: Math.round(
              t.principal * Math.max(0, t.annualRate - getMortgageMarketBenchmarkRatePct()) * 0.01
            ),
          })
        }
      } else {
        const maturity = c.maturityDate ? new Date(c.maturityDate) : null
        if (maturity && maturity >= now) {
          const dLeft = daysBetween(now, maturity)
          if (dLeft <= 180) {
            events.push({
              id: `${c.id}-mortgage-fallback`,
              kind: "mortgage_maturity",
              contractId: c.id,
              provider: c.provider ?? null,
              category: c.category,
              daysUntil: dLeft,
              dueAt: startOfDay(maturity),
              windowBucket: renewalWindowBucket(dLeft) ?? undefined,
              title: c.provider ?? "Hypothèque",
              description: `Échéance hypothécaire dans ${dLeft} j.`,
              recommendedAction: "Anticiper la renégociation avec votre établissement.",
              urgency: urgencyFromDays(dLeft, "mortgage_maturity"),
              estimatedImpactChfYear: 0,
            })
          }
        }
      }
      continue
    }

    const keyDate = getKeyDateFromContractLike(c)
    if (!keyDate || keyDate < now) continue
    const daysUntil = daysBetween(now, keyDate)
    if (daysUntil > 60) continue
    const bucket = renewalWindowBucket(daysUntil)
    if (!bucket) continue
    const monthly = monthlyPremiumChf(c)
    const impact = monthly > 0 ? Math.round(monthly * 12 * 0.08) : 0
    events.push({
      id: `${c.id}-renewal-${keyDate.toISOString().slice(0, 10)}`,
      kind: "renewal_soon",
      contractId: c.id,
      provider: c.provider ?? null,
      category: c.category ?? null,
      daysUntil,
      dueAt: startOfDay(keyDate),
      windowBucket: bucket,
      title: c.provider ?? "Contrat",
      description: `Échéance / renouvellement dans ${daysUntil} j. (fenêtre ${bucket} j).`,
      recommendedAction: "Comparer les offres et renégocier ou résilier dans les délais.",
      urgency: urgencyFromDays(daysUntil, "renewal_soon"),
      estimatedImpactChfYear: impact,
    })
  }

  return events.sort((a, b) => {
    const u = { high: 0, medium: 1, low: 2 }
    if (u[a.urgency] !== u[b.urgency]) return u[a.urgency] - u[b.urgency]
    return a.daysUntil - b.daysUntil
  })
}
