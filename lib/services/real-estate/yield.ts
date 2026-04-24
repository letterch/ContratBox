import { computeMortgageCharges, toMonthlyAmount, type Frequency } from "@/lib/services/real-estate/finance"

export type RentRow = {
  rentMonthly: number
  chargesMonthly: number
  isRented: boolean
}

export type RentPaymentRow = {
  expectedAmount: number
  receivedAmount: number
}

export type YieldSummary = {
  monthlyRentalPotential: number
  monthlyRentalReceived: number
  monthlyPropertyCharges: number
  monthlyNetCashflow: number
  annualNetCashflow: number
  grossYieldPct: number
  netYieldPct: number
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

  const monthlyRentalReceivedRaw = input.payments.reduce((sum, p) => sum + Math.max(0, p.receivedAmount), 0)
  const monthlyRentalReceived =
    input.payments.length > 0 ? monthlyRentalReceivedRaw / Math.max(1, input.payments.length) : monthlyRentalPotential

  const finance = computeMortgageCharges({
    mortgageTranches: input.mortgageTranches,
    amortizationEntries: input.amortizationEntries,
    additionalCharges: input.extraCharges,
  })

  const monthlyPropertyCharges = finance.monthlyTotal
  const monthlyNetCashflow = monthlyRentalReceived - monthlyPropertyCharges
  const annualNetCashflow = monthlyNetCashflow * 12
  const propertyValue = Math.max(1, input.propertyValue)
  const grossYieldPct = (monthlyRentalPotential * 12 * 100) / propertyValue
  const netYieldPct = (annualNetCashflow * 100) / propertyValue

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
