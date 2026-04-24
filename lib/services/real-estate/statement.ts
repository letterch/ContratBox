import { toMonthlyAmount, type Frequency } from "@/lib/services/real-estate/finance"

export type StatementLine = {
  label: string
  amount: number
}

export type ChargeStatementPayload = {
  periodStart: string
  periodEnd: string
  tenantName: string | null
  tenantAllocationPct: number
  totalCharges: number
  totalProvisions: number
  balance: number
  lines: StatementLine[]
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function buildChargeStatementPayload(input: {
  periodStart: Date
  periodEnd: Date
  tenantName?: string | null
  tenantAllocationPct: number
  charges: Array<{ label: string; amount: number; frequency: Frequency }>
  mortgageMonthlyCost: number
  provisionsPaidByTenant: number
}): ChargeStatementPayload {
  const tenantAllocationPct = Math.max(0, Math.min(100, input.tenantAllocationPct))
  const recurringLines = input.charges.map((c) => ({
    label: c.label,
    amount: toMonthlyAmount(c.amount, c.frequency) * 12,
  }))
  const mortgageLine = {
    label: "Charges hypothécaires (intérêts + amortissement) annualisées",
    amount: input.mortgageMonthlyCost * 12,
  }
  const grossAnnualCharges = recurringLines.reduce((s, l) => s + l.amount, 0) + mortgageLine.amount
  const tenantCharges = grossAnnualCharges * (tenantAllocationPct / 100)
  const totalProvisions = Math.max(0, input.provisionsPaidByTenant)
  const balance = tenantCharges - totalProvisions
  const lines: StatementLine[] = [...recurringLines, mortgageLine]

  return {
    periodStart: input.periodStart.toISOString().slice(0, 10),
    periodEnd: input.periodEnd.toISOString().slice(0, 10),
    tenantName: input.tenantName ?? null,
    tenantAllocationPct: round2(tenantAllocationPct),
    totalCharges: round2(tenantCharges),
    totalProvisions: round2(totalProvisions),
    balance: round2(balance),
    lines: lines.map((l) => ({ label: l.label, amount: round2(l.amount) })),
  }
}
