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

/** Lien prérempli vers NextLetter pour une résiliation de contrat (assurance, télécom, etc.) */
export function buildContractCancellationNextLetterUrl(input: {
  provider?: string | null
  policyNumber?: string | null
  contractTitle?: string | null
  category?: string | null
  noticeDays?: number | null
  renewalDateIso?: string | null
  memberName?: string | null
  extraContext?: string | null
}) {
  const base = getNextLetterBaseUrl()
  const url = new URL("/compose", base)
  url.searchParams.set("type", "contract_cancellation")
  if (input.provider) url.searchParams.set("provider", input.provider)
  if (input.policyNumber) url.searchParams.set("policy", input.policyNumber)
  if (input.contractTitle) url.searchParams.set("title", input.contractTitle)
  if (input.category) url.searchParams.set("category", input.category)
  if (input.noticeDays != null) url.searchParams.set("notice_days", String(input.noticeDays))
  if (input.renewalDateIso) url.searchParams.set("renewal", input.renewalDateIso)
  if (input.memberName) url.searchParams.set("member", input.memberName)
  if (input.extraContext) url.searchParams.set("context", input.extraContext.slice(0, 500))
  return url.toString()
}

/** Courrier type banque / renégociation hypothèque (NextLetter — préremplissage) */
export function buildMortgageBankLetterNextLetterUrl(input: {
  bankName?: string | null
  contractTitle?: string | null
  principalChf?: number | null
  currentRatePct?: number | null
  benchmarkRatePct?: number | null
  maturityIso?: string | null
  context?: string | null
}) {
  const base = getNextLetterBaseUrl()
  const url = new URL("/compose", base)
  url.searchParams.set("type", "mortgage_bank_letter")
  if (input.bankName) url.searchParams.set("bank", input.bankName)
  if (input.contractTitle) url.searchParams.set("title", input.contractTitle)
  if (input.principalChf != null) url.searchParams.set("principal", String(Math.round(input.principalChf)))
  if (input.currentRatePct != null) url.searchParams.set("rate_current", String(input.currentRatePct))
  if (input.benchmarkRatePct != null) url.searchParams.set("rate_benchmark", String(input.benchmarkRatePct))
  if (input.maturityIso) url.searchParams.set("maturity", input.maturityIso)
  if (input.context) url.searchParams.set("context", input.context.slice(0, 500))
  return url.toString()
}
