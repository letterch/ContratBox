export type MortgageAmortizationType = "direct" | "indirect" | "none"

type ContractLike = {
  id: string
  provider?: string | null
  startDate?: Date | string | null
  maturityDate?: Date | string | null
  mortgageRate?: number | { toNumber?: () => number } | null
  rawExtraction?: unknown
}

export type MortgageTranche = {
  name: string
  principal: number
  annualRate: number
  startDate: Date | null
  endDate: Date | null
  amortizationType: MortgageAmortizationType
}

export type MortgageTrancheMetrics = MortgageTranche & {
  durationMonths: number
  daysToMaturity: number | null
  annualInterestEstimate: number
  totalInterestEstimate: number
  totalAmortizationEstimate: number
  totalCostEstimate: number
}

export type MortgagePlan = {
  isMortgage: boolean
  principalTotal: number
  tranches: MortgageTrancheMetrics[]
  totalInterestEstimate: number
  totalAmortizationEstimate: number
  totalCostEstimate: number
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = Number(value.replace(",", ".").replace(/[^0-9.-]/g, ""))
    return Number.isFinite(n) ? n : null
  }
  if (value && typeof value === "object" && "toNumber" in value) {
    const v = (value as { toNumber?: () => number }).toNumber?.()
    return typeof v === "number" && Number.isFinite(v) ? v : null
  }
  return null
}

function asDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string") {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function normalizeAmortizationType(value: unknown): MortgageAmortizationType {
  const v = String(value ?? "").trim().toLowerCase()
  if (v === "direct" || v.includes("direct")) return "direct"
  if (v === "indirect" || v.includes("indirect")) return "indirect"
  return "none"
}

function monthsBetween(start: Date | null, end: Date | null): number {
  if (!start || !end || end <= start) return 0
  const years = end.getFullYear() - start.getFullYear()
  const months = end.getMonth() - start.getMonth()
  const raw = years * 12 + months
  return Math.max(1, raw)
}

function durationYears(durationMonths: number): number {
  return Math.max(0, durationMonths) / 12
}

function computeTrancheMetrics(tranche: MortgageTranche): MortgageTrancheMetrics {
  const durationMonths = monthsBetween(tranche.startDate, tranche.endDate)
  const years = durationYears(durationMonths)
  const annualInterestEstimate = tranche.principal * (tranche.annualRate / 100)
  let totalInterestEstimate = 0
  let totalAmortizationEstimate = 0

  if (tranche.amortizationType === "direct") {
    // Approximation métier: amortissement linéaire jusqu'à 0.
    totalAmortizationEstimate = tranche.principal
    totalInterestEstimate = (tranche.principal / 2) * (tranche.annualRate / 100) * years
  } else if (tranche.amortizationType === "indirect") {
    // Le capital reste dû jusqu'à échéance, intérêts calculés sur capital plein.
    totalAmortizationEstimate = tranche.principal
    totalInterestEstimate = tranche.principal * (tranche.annualRate / 100) * years
  } else {
    totalAmortizationEstimate = 0
    totalInterestEstimate = tranche.principal * (tranche.annualRate / 100) * years
  }

  const now = new Date()
  const daysToMaturity = tranche.endDate
    ? Math.ceil((tranche.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    : null

  return {
    ...tranche,
    durationMonths,
    daysToMaturity,
    annualInterestEstimate,
    totalInterestEstimate,
    totalAmortizationEstimate,
    totalCostEstimate: totalInterestEstimate + totalAmortizationEstimate,
  }
}

export function getMortgagePlan(contract: ContractLike): MortgagePlan {
  const raw = (contract.rawExtraction && typeof contract.rawExtraction === "object"
    ? (contract.rawExtraction as Record<string, unknown>)
    : {}) as Record<string, unknown>

  const principal = asNumber(raw.mortgagePrincipal)
  const amortizationType = normalizeAmortizationType(raw.amortizationType)
  const rootRate = asNumber(raw.mortgageRate) ?? asNumber(contract.mortgageRate)
  const rootStartDate = asDate(raw.startDate) ?? asDate(contract.startDate)
  const rootEndDate = asDate(raw.maturityDate) ?? asDate(contract.maturityDate)

  const rawTranches = Array.isArray(raw.mortgageTranches) ? raw.mortgageTranches : []
  const parsedTranches: MortgageTranche[] = rawTranches
    .map((t, idx) => {
      const row = (t && typeof t === "object" ? (t as Record<string, unknown>) : null)
      if (!row) return null
      const rowPrincipal = asNumber(row.principal)
      const rowRate = asNumber(row.rate)
      if (!rowPrincipal || rowPrincipal <= 0 || rowRate == null || rowRate < 0) return null
      return {
        name: String(row.name ?? `Tranche ${idx + 1}`),
        principal: rowPrincipal,
        annualRate: rowRate,
        startDate: asDate(row.startDate) ?? rootStartDate,
        endDate: asDate(row.endDate) ?? rootEndDate,
        amortizationType: normalizeAmortizationType(row.amortizationType ?? amortizationType),
      } satisfies MortgageTranche
    })
    .filter((t): t is MortgageTranche => Boolean(t))

  const fallbackTranche =
    parsedTranches.length === 0 && principal && principal > 0 && rootRate != null
      ? [
          {
            name: "Tranche principale",
            principal,
            annualRate: rootRate,
            startDate: rootStartDate,
            endDate: rootEndDate,
            amortizationType,
          } satisfies MortgageTranche,
        ]
      : []

  const tranches = [...parsedTranches, ...fallbackTranche].map(computeTrancheMetrics)
  const principalTotal = tranches.reduce((sum, t) => sum + t.principal, 0)
  const totalInterestEstimate = tranches.reduce((sum, t) => sum + t.totalInterestEstimate, 0)
  const totalAmortizationEstimate = tranches.reduce((sum, t) => sum + t.totalAmortizationEstimate, 0)
  const totalCostEstimate = totalInterestEstimate + totalAmortizationEstimate
  const isMortgage = tranches.length > 0

  return {
    isMortgage,
    principalTotal,
    tranches,
    totalInterestEstimate,
    totalAmortizationEstimate,
    totalCostEstimate,
  }
}

export function getMortgageAlerts(
  contracts: Array<ContractLike & { category?: string | null }>,
  windowDays = 120
) {
  const alerts: Array<{
    id: string
    contractId: string
    provider: string
    trancheName: string
    annualRate: number
    maturityDate: Date
    daysLeft: number
  }> = []

  for (const contract of contracts) {
    if (contract.category !== "mortgage") continue
    const plan = getMortgagePlan(contract)
    if (plan.isMortgage) {
      for (const tranche of plan.tranches) {
        if (!tranche.endDate || tranche.daysToMaturity == null) continue
        if (tranche.daysToMaturity < 0 || tranche.daysToMaturity > windowDays) continue
        alerts.push({
          id: `${contract.id}-${tranche.name}-${tranche.endDate.toISOString()}`,
          contractId: contract.id,
          provider: contract.provider ?? "Hypothèque",
          trancheName: tranche.name,
          annualRate: tranche.annualRate,
          maturityDate: tranche.endDate,
          daysLeft: tranche.daysToMaturity,
        })
      }
      continue
    }

    // Fallback: contrats hypothécaires sans tranches/champs financiers,
    // mais avec une date d'échéance renseignée.
    const maturity = asDate(contract.maturityDate)
    if (!maturity) continue
    const daysLeft = Math.ceil((maturity.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    if (daysLeft < 0 || daysLeft > windowDays) continue
    alerts.push({
      id: `${contract.id}-maturity-${maturity.toISOString()}`,
      contractId: contract.id,
      provider: contract.provider ?? "Hypothèque",
      trancheName: "Échéance principale",
      annualRate: asNumber(contract.mortgageRate) ?? 0,
      maturityDate: maturity,
      daysLeft,
    })
  }

  return alerts.sort((a, b) => a.daysLeft - b.daysLeft)
}
