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
  monthlyAmortizationDirect: number
  monthlyAmortizationIndirect: number
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
  mortgageTranches: MortgageTrancheInput[]
  amortizationEntries: Array<{
    principal: number
    ratePct: number
    mode?: "direct" | "indirect"
  }>
  additionalCharges?: PropertyChargeInput[]
}): MortgageCostBreakdown {
  const mortgageTranches = input.mortgageTranches.filter((t) => t.principal > 0 && t.ratePct >= 0)
  const amortizationEntries = input.amortizationEntries.filter((a) => a.principal > 0 && a.ratePct >= 0)

  const monthlyInterest = mortgageTranches.reduce(
    (sum, t) => sum + (safeNumber(t.principal) * safeNumber(t.ratePct)) / 100 / 4 / 3,
    0
  )
  const monthlyAmortizationDirect = amortizationEntries
    .filter((a) => (a.mode ?? "direct") === "direct")
    .reduce((sum, a) => sum + (safeNumber(a.principal) * safeNumber(a.ratePct)) / 100 / 4 / 3, 0)
  const monthlyAmortizationIndirect = amortizationEntries
    .filter((a) => (a.mode ?? "direct") === "indirect")
    .reduce((sum, a) => sum + (safeNumber(a.principal) * safeNumber(a.ratePct)) / 100 / 4 / 3, 0)
  const monthlyAmortization = monthlyAmortizationDirect + monthlyAmortizationIndirect
  const monthlyAdditionalCharges = (input.additionalCharges ?? []).reduce(
    (sum, c) => sum + toMonthlyAmount(c.amount, c.frequency),
    0
  )
  const monthlyMortgageTotal = monthlyInterest + monthlyAmortization
  const monthlyTotal = monthlyMortgageTotal + monthlyAdditionalCharges
  return {
    monthlyInterest,
    monthlyAmortization,
    monthlyAmortizationDirect,
    monthlyAmortizationIndirect,
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
