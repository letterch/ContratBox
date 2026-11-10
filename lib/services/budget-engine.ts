import { toMonthlyAmount, toAnnualAmount } from "@/lib/services/recurrence"

export type IncomeLike = {
  amount: unknown
  frequency: string | null
  isActive?: boolean
  scope?: string | null
  memberId?: string | null
}

export type PremiumLike = {
  premiumAmount?: unknown
  premiumFrequency?: string | null
  amount?: unknown
  recurrence?: string | null
  frequency?: string | null
  status?: string | null
  memberId?: string | null
  isHouseholdWide?: boolean
}

export type BudgetCashflow = {
  incomeMonthly: number
  incomeAnnual: number
  premiumsMonthly: number
  premiumsAnnual: number
  billsMonthly: number
  billsAnnual: number
  expensesMonthly: number
  expensesAnnual: number
  netMonthly: number
  netAnnual: number
}

/**
 * Agrège revenus − primes contrats − factures pour le dashboard Accueil.
 */
export function buildHouseholdCashflow(input: {
  incomes: IncomeLike[]
  contracts: PremiumLike[]
  bills: PremiumLike[]
}): BudgetCashflow {
  let incomeMonthly = 0
  for (const i of input.incomes) {
    if (i.isActive === false) continue
    incomeMonthly += toMonthlyAmount(Number(i.amount), i.frequency)
  }

  let premiumsMonthly = 0
  for (const c of input.contracts) {
    if (c.status && c.status !== "active") continue
    const amt = c.premiumAmount ?? c.amount
    if (amt == null) continue
    premiumsMonthly += toMonthlyAmount(Number(amt), c.premiumFrequency ?? c.frequency ?? "monthly")
  }

  let billsMonthly = 0
  for (const b of input.bills) {
    if (b.status === "cancelled") continue
    const amt = b.amount ?? b.premiumAmount
    if (amt == null) continue
    billsMonthly += toMonthlyAmount(Number(amt), b.recurrence ?? b.frequency ?? "one_off")
  }

  const expensesMonthly = premiumsMonthly + billsMonthly
  return {
    incomeMonthly: round2(incomeMonthly),
    incomeAnnual: round2(incomeMonthly * 12),
    premiumsMonthly: round2(premiumsMonthly),
    premiumsAnnual: round2(premiumsMonthly * 12),
    billsMonthly: round2(billsMonthly),
    billsAnnual: round2(billsMonthly * 12),
    expensesMonthly: round2(expensesMonthly),
    expensesAnnual: round2(expensesMonthly * 12),
    netMonthly: round2(incomeMonthly - expensesMonthly),
    netAnnual: round2((incomeMonthly - expensesMonthly) * 12),
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export { toMonthlyAmount, toAnnualAmount }
