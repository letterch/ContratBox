import { computeMortgageCharges, toMonthlyAmount, type Frequency } from "@/lib/services/real-estate/finance"

export type RentRow = {
  rentMonthly: number
  chargesMonthly: number
  isRented: boolean
}

export type RentPaymentRow = {
  expectedAmount: number
  receivedAmount: number
  /** 1er du mois (loyer encaissé) — sert à annualiser les montants réels */
  month?: Date | null
}

export type YieldSummary = {
  monthlyRentalPotential: number
  monthlyRentalReceived: number
  monthlyPropertyCharges: number
  monthlyNetCashflow: number
  annualNetCashflow: number
  /** Null si aucune valeur de bien renseignée (montant strictement positif en CHF) */
  grossYieldPct: number | null
  netYieldPct: number | null
}

export function computeYieldSummary(input: {
  propertyValue: number
  rents: RentRow[]
  payments: RentPaymentRow[]
  mortgageTranches: Array<{ principal: number; ratePct: number; rateType: "fixed" | "saron" }>
  amortizationEntries: Array<{ principal: number; ratePct: number; mode?: "direct" | "indirect" }>
  extraCharges: Array<{ amount: number; frequency: Frequency }>
}): YieldSummary {
  const monthlyRentalPotential = input.rents
    .filter((r) => r.isRented)
    .reduce((sum, r) => sum + Math.max(0, r.rentMonthly + r.chargesMonthly), 0)

  let monthlyRentalReceived = monthlyRentalPotential
  const pays = input.payments.filter((p) => {
    if (!p.month) return false
    const d = p.month instanceof Date ? p.month : new Date(p.month)
    return !Number.isNaN(d.getTime())
  })
  if (pays.length > 0) {
    const totalReceived = pays.reduce((sum, p) => sum + Math.max(0, p.receivedAmount), 0)
    const monthKeys = new Set(
      pays.map((p) => {
        const d = p.month instanceof Date ? p.month : new Date(p.month!)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      })
    )
    monthlyRentalReceived = totalReceived / Math.max(1, monthKeys.size)
  }

  const finance = computeMortgageCharges({
    mortgageTranches: input.mortgageTranches,
    amortizationEntries: input.amortizationEntries,
    additionalCharges: input.extraCharges,
  })

  const monthlyPropertyCharges = finance.monthlyTotal
  const monthlyNetCashflow = monthlyRentalReceived - monthlyPropertyCharges
  const annualNetCashflow = monthlyNetCashflow * 12
  const basis = input.propertyValue
  const hasYieldBasis = Number.isFinite(basis) && basis > 0
  const grossYieldPct = hasYieldBasis ? (monthlyRentalPotential * 12 * 100) / basis : null
  const netYieldPct = hasYieldBasis ? (annualNetCashflow * 100) / basis : null

  return {
    monthlyRentalPotential,
    monthlyRentalReceived,
    monthlyPropertyCharges,
    monthlyNetCashflow,
    annualNetCashflow,
    grossYieldPct,
    netYieldPct,
  }
}

export function summarizeRecurringCharges(
  charges: Array<{ label: string; amount: number; frequency: Frequency }>
): Array<{ label: string; monthly: number }> {
  return charges.map((c) => ({
    label: c.label,
    monthly: toMonthlyAmount(c.amount, c.frequency),
  }))
}
