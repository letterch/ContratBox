type ContractForCost = {
  id: string
  provider?: string | null
  category?: string | null
  premiumAmount?: number | { toNumber?: () => number } | null
  premiumFrequency?: string | null
  rawExtraction?: unknown
}

export type CostBreakdownItem = {
  key: string
  label: string
  monthly: number
}

export type CostInsights = {
  monthlyTotal: number
  annualTotal: number
  breakdown: CostBreakdownItem[]
  suggestions: string[]
  optimizationScore: number
  potentialSavingsMonthly: number
  actionPlan: Array<{
    id: string
    title: string
    impactMonthly: number
    priority: "high" | "medium" | "low"
  }>
}

export type CostInsightConfig = {
  housingRatioTarget: number
  telecomMonthlyTarget: number
  energyMonthlyTarget: number
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = Number(value.replace(",", ".").replace(/[^0-9.-]/g, ""))
    return Number.isFinite(n) ? n : 0
  }
  if (value && typeof value === "object" && "toNumber" in value) {
    const n = (value as { toNumber?: () => number }).toNumber?.()
    return typeof n === "number" && Number.isFinite(n) ? n : 0
  }
  return 0
}

function monthlyFromPremium(amount: number, frequency?: string | null): number {
  if (amount <= 0) return 0
  if (frequency === "annual") return amount / 12
  return amount
}

function categoryLabel(category: string | null | undefined): string {
  switch (category) {
    case "rent_lease":
      return "Logement (loyer + charges)"
    case "mortgage":
      return "Hypothèque"
    case "telecom_internet":
    case "telecom_mobile":
      return "Télécom"
    case "utilities_electricity":
    case "utilities_gas":
      return "Énergie"
    default:
      return "Autres contrats"
  }
}

export function buildHouseholdCostInsights(
  contracts: ContractForCost[],
  config: CostInsightConfig = {
    housingRatioTarget: 35,
    telecomMonthlyTarget: 90,
    energyMonthlyTarget: 180,
  }
): CostInsights {
  const bucket = new Map<string, number>()

  for (const c of contracts) {
    const raw =
      c.rawExtraction && typeof c.rawExtraction === "object"
        ? (c.rawExtraction as Record<string, unknown>)
        : {}
    const leaseRent = asNumber(raw.leaseMonthlyRent)
    const leaseCharges = asNumber(raw.leaseMonthlyCharges)
    const monthlyCost =
      c.category === "rent_lease" && leaseRent + leaseCharges > 0
        ? leaseRent + leaseCharges
        : monthlyFromPremium(asNumber(c.premiumAmount), c.premiumFrequency)
    if (monthlyCost <= 0) continue
    const key = c.category ?? "other"
    bucket.set(key, (bucket.get(key) ?? 0) + monthlyCost)
  }

  const breakdown: CostBreakdownItem[] = Array.from(bucket.entries())
    .map(([key, monthly]) => ({
      key,
      label: categoryLabel(key),
      monthly,
    }))
    .sort((a, b) => b.monthly - a.monthly)

  const monthlyTotal = breakdown.reduce((s, b) => s + b.monthly, 0)
  const annualTotal = monthlyTotal * 12

  const housing = breakdown.find((b) => b.key === "rent_lease" || b.key === "mortgage")?.monthly ?? 0
  const telecom = breakdown
    .filter((b) => b.key === "telecom_internet" || b.key === "telecom_mobile")
    .reduce((s, b) => s + b.monthly, 0)
  const energy = breakdown
    .filter((b) => b.key === "utilities_electricity" || b.key === "utilities_gas")
    .reduce((s, b) => s + b.monthly, 0)

  const suggestions: string[] = []
  const actionPlan: CostInsights["actionPlan"] = []
  let potentialSavingsMonthly = 0
  if (housing > 0 && monthlyTotal > 0 && housing / monthlyTotal > config.housingRatioTarget / 100) {
    const ratio = housing / monthlyTotal
    const overPercent = Math.max(0, ratio - config.housingRatioTarget / 100)
    const estimatedImpact = Math.round(housing * Math.min(0.1, overPercent))
    potentialSavingsMonthly += estimatedImpact
    suggestions.push(`Le poste logement dépasse ${config.housingRatioTarget}% des dépenses: comparez hypothèque/bail et renégociez avant échéance.`)
    actionPlan.push({
      id: "housing_renegotiation",
      title: "Renégocier le poste logement (bail/hypothèque)",
      impactMonthly: estimatedImpact,
      priority: "high",
    })
  }
  if (telecom > config.telecomMonthlyTarget) {
    const estimatedImpact = Math.round((telecom - config.telecomMonthlyTarget) * 0.5)
    potentialSavingsMonthly += estimatedImpact
    suggestions.push("Vos coûts télécom sont élevés: une revue d’abonnements peut réduire la facture mensuelle.")
    actionPlan.push({
      id: "telecom_bundle",
      title: "Optimiser les abonnements télécom (bundle / migration)",
      impactMonthly: estimatedImpact,
      priority: "medium",
    })
  }
  if (energy > config.energyMonthlyTarget) {
    const estimatedImpact = Math.round((energy - config.energyMonthlyTarget) * 0.35)
    potentialSavingsMonthly += estimatedImpact
    suggestions.push("Coûts énergie importants: vérifiez tarifs et optimisations (heures creuses, bundle, fournisseur).")
    actionPlan.push({
      id: "energy_tariff",
      title: "Ajuster tarif/fournisseur énergie",
      impactMonthly: estimatedImpact,
      priority: "medium",
    })
  }
  if (suggestions.length === 0) {
    suggestions.push("Activez l’assistant IA pour détecter des économies contrat par contrat.")
    actionPlan.push({
      id: "maintain_monitoring",
      title: "Maintenir le suivi mensuel et relancer une revue trimestrielle",
      impactMonthly: 0,
      priority: "low",
    })
  }
  const scorePenalty = Math.min(70, potentialSavingsMonthly > 0 ? Math.round((potentialSavingsMonthly / Math.max(monthlyTotal, 1)) * 100) : 0)
  const optimizationScore = Math.max(30, 100 - scorePenalty)

  return {
    monthlyTotal,
    annualTotal,
    breakdown,
    suggestions,
    optimizationScore,
    potentialSavingsMonthly,
    actionPlan,
  }
}
