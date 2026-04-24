export function getNextLetterBaseUrl(): string {
  return process.env.NEXTLETTER_BASE_URL?.trim() || "https://nextletter.ch"
}

export function buildChargeStatementNextLetterUrl(input: {
  propertyName: string
  tenantName?: string | null
  periodStart: string
  periodEnd: string
  totalCharges: number
  totalProvisions: number
  balance: number
}) {
  const base = getNextLetterBaseUrl()
  const url = new URL("/compose", base)
  url.searchParams.set("type", "decompte_charges")
  url.searchParams.set("property", input.propertyName)
  if (input.tenantName) url.searchParams.set("tenant", input.tenantName)
  url.searchParams.set("period_start", input.periodStart)
  url.searchParams.set("period_end", input.periodEnd)
  url.searchParams.set("charges_total", String(input.totalCharges))
  url.searchParams.set("provisions_total", String(input.totalProvisions))
  url.searchParams.set("balance", String(input.balance))
  return url.toString()
}
