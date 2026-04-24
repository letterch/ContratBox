export type Frequency = "monthly" | "quarterly" | "annual"

export type MortgageTrancheInput = {
  principal: number
  ratePct: number
  rateType: "fixed" | "saron"
  endDate?: Date | null
}

export type PropertyChargeInput = {
  amount: number
  frequency: Frequency
}

export type MortgageCostBreakdown = {
  monthlyInterest: number
  monthlyAmortization: number
  monthlyMortgageTotal: number
  monthlyAdditionalCharges: number
  monthlyTotal: number
  quarterlyTotal: number
  annualTotal: number
}

function safeNumber(v: number): number {
  return Number.isFinite(v) ? v : 0
}

export function toMonthlyAmount(amount: number, frequency: Frequency): number {
  const a = Math.max(0, safeNumber(amount))
  if (frequency === "annual") return a / 12
  if (frequency === "quarterly") return a / 3
  return a
}

/**
 * Règle métier demandée:
 * intérêts mensuels = dette * taux / 100 / 4 / 3
 * amortissement mensuel = dette * tauxAmortissement / 100 / 4 / 3
 */
export function computeMortgageCharges(input: {
  tranches: MortgageTrancheInput[]
  amortizationRatePct: number
  additionalCharges?: PropertyChargeInput[]
}): MortgageCostBreakdown {
  const amortizationRatePct = Math.max(0, safeNumber(input.amortizationRatePct))
  const tranches = input.tranches.filter((t) => t.principal > 0 && t.ratePct >= 0)

  const monthlyInterest = tranches.reduce(
    (sum, t) => sum + (safeNumber(t.principal) * safeNumber(t.ratePct)) / 100 / 4 / 3,
    0
  )
  const monthlyAmortization = tranches.reduce(
    (sum, t) => sum + (safeNumber(t.principal) * amortizationRatePct) / 100 / 4 / 3,
    0
  )
  const monthlyAdditionalCharges = (input.additionalCharges ?? []).reduce(
    (sum, c) => sum + toMonthlyAmount(c.amount, c.frequency),
    0
  )
  const monthlyMortgageTotal = monthlyInterest + monthlyAmortization
  const monthlyTotal = monthlyMortgageTotal + monthlyAdditionalCharges
  return {
    monthlyInterest,
    monthlyAmortization,
    monthlyMortgageTotal,
    monthlyAdditionalCharges,
    monthlyTotal,
    quarterlyTotal: monthlyTotal * 3,
    annualTotal: monthlyTotal * 12,
  }
}

export function computeMortgageMaturityAlerts(
  tranches: Array<MortgageTrancheInput & { id: string; name?: string | null }>,
  windowDays = 120
) {
  const now = Date.now()
  return tranches
    .filter((t) => t.endDate instanceof Date)
    .map((t) => {
      const end = t.endDate as Date
      const daysLeft = Math.ceil((end.getTime() - now) / (24 * 60 * 60 * 1000))
      return {
        trancheId: t.id,
        trancheName: t.name ?? "Tranche",
        endDate: end,
        daysLeft,
      }
    })
    .filter((x) => x.daysLeft >= 0 && x.daysLeft <= windowDays)
    .sort((a, b) => a.daysLeft - b.daysLeft)
}
