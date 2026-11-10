import { CONTRACT_CATEGORIES, type ContractCategorySlug } from "@/lib/constants"

/** Groupes UX pour filtrer le dashboard (totaux agrégés). */
export const DASHBOARD_CATEGORY_GROUPS = {
  all: {
    id: "all",
    label: "Tout",
    slugs: null as string[] | null,
  },
  health: {
    id: "health",
    label: "Assurances maladie",
    slugs: ["health_basic", "health_supplementary"],
  },
  insurance: {
    id: "insurance",
    label: "Autres assurances",
    slugs: [
      "household_insurance",
      "personal_liability",
      "car_insurance",
      "legal_protection",
      "travel_insurance",
      "life_insurance",
    ],
  },
  subscriptions: {
    id: "subscriptions",
    label: "Abonnements & télécom",
    slugs: ["telecom_mobile", "telecom_internet", "subscriptions", "tv_streaming"],
  },
  housing: {
    id: "housing",
    label: "Habitat",
    slugs: ["rent_lease", "mortgage", "utilities_electricity", "utilities_gas", "ppe_charges"],
  },
  other: {
    id: "other",
    label: "Autres",
    slugs: ["leasing", "banking_recurring", "taxes_installments", "pension_3a", "other"],
  },
} as const

export type DashboardCategoryGroupId = keyof typeof DASHBOARD_CATEGORY_GROUPS

export type DashboardScopeId = "all" | "household" | string // string = memberId

export function contractMatchesCategoryGroup(
  category: string | null | undefined,
  groupId: DashboardCategoryGroupId
): boolean {
  const group = DASHBOARD_CATEGORY_GROUPS[groupId]
  if (!group || group.slugs == null) return true
  const cat = category ?? "other"
  if (groupId === "other") {
    const known = new Set<string>()
    for (const id of Object.keys(DASHBOARD_CATEGORY_GROUPS) as DashboardCategoryGroupId[]) {
      if (id === "all" || id === "other") continue
      const slugs = DASHBOARD_CATEGORY_GROUPS[id].slugs as readonly string[] | null
      if (!slugs) continue
      for (const slug of slugs) known.add(slug)
    }
    return !known.has(cat) || (group.slugs as readonly string[]).includes(cat)
  }
  return (group.slugs as readonly string[]).includes(cat)
}

export function categoryLabel(slug: string | null | undefined): string {
  if (!slug) return CONTRACT_CATEGORIES.other
  return CONTRACT_CATEGORIES[slug as ContractCategorySlug] ?? slug
}

/** Coût mensuel normalisé d’un contrat. */
export function monthlyPremiumOf(c: {
  category?: string | null
  premiumAmount?: unknown
  premiumFrequency?: string | null
  rawExtraction?: unknown
}): number {
  if (c.category === "rent_lease" && c.rawExtraction && typeof c.rawExtraction === "object") {
    const raw = c.rawExtraction as Record<string, unknown>
    const rent = Number(raw.leaseMonthlyRent ?? 0) || 0
    const charges = Number(raw.leaseMonthlyCharges ?? 0) || 0
    if (rent + charges > 0) return rent + charges
  }
  const n = Number(c.premiumAmount ?? 0)
  if (!Number.isFinite(n) || n <= 0) return 0
  if (c.premiumFrequency === "annual") return n / 12
  return n
}
