/** Conversion fréquences financières → montant mensuel (logique BudgetFamille). */

export type FinanceFrequency =
  | "monthly"
  | "quarterly"
  | "semiannual"
  | "yearly"
  | "annual"
  | "one_time"
  | "one_off"
  | "thirteenth_salary"

export function toMonthlyAmount(amount: number, frequency: string | null | undefined): number {
  const n = Number(amount)
  if (!Number.isFinite(n)) return 0
  switch ((frequency ?? "monthly").toLowerCase()) {
    case "monthly":
      return n
    case "quarterly":
      return n / 3
    case "semiannual":
      return n / 6
    case "yearly":
    case "annual":
      return n / 12
    case "thirteenth_salary":
      return n / 12
    case "one_time":
    case "one_off":
      return n / 12
    default:
      return n
  }
}

export function toAnnualAmount(amount: number, frequency: string | null | undefined): number {
  return toMonthlyAmount(amount, frequency) * 12
}
