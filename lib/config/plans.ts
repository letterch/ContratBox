/**
 * Source de vérité des plans ContratBox (code, pas DB).
 * Les price IDs Stripe viennent des variables d'environnement ; le mapping price → plan est ici.
 */

export const PLAN_SLUGS = ["free", "solo", "family", "care"] as const
export type PlanSlug = (typeof PLAN_SLUGS)[number]
export type PaidPlanSlug = Exclude<PlanSlug, "free">

/** Modules / capacités pilotés par le plan (hors toggles plateforme `app_features`). */
export const PLAN_FEATURE_KEYS = [
  "module_ai_chat",
  "module_inbox",
  "module_tasks",
  "module_real_estate",
  "module_bills",
  "module_multi_household",
  "module_advanced_care",
] as const
export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number]

export type PlanQuotas = {
  /** null = illimité */
  maxContracts: number | null
  /** Factures mensuelles : null = illimité */
  maxBills: number | null
  maxInboxItems: number | null
  maxTasks: number | null
  /** Questions assistant IA / mois calendaire : null = illimité */
  maxAiQuestionsPerMonth: number | null
  /** Foyers dont l’utilisateur est owner (accès futur multi-foyer) */
  maxOwnedHouseholds: number
}

export type PlanDefinition = {
  slug: PlanSlug
  label: string
  description: string
  quotas: PlanQuotas
  /** Fonctionnalités incluses dans le plan (avant intersection avec les flags globaux). */
  features: Record<PlanFeatureKey, boolean>
}

const soloFeatures: Record<PlanFeatureKey, boolean> = {
  module_ai_chat: true,
  module_inbox: true,
  module_tasks: true,
  module_real_estate: true,
  module_bills: true,
  module_multi_household: false,
  module_advanced_care: false,
}

export const PLANS: Record<PlanSlug, PlanDefinition> = {
  free: {
    slug: "free",
    label: "Gratuit",
    description: "Découverte — 2 contrats, 2 factures, 5 questions IA / mois.",
    quotas: {
      maxContracts: 2,
      maxBills: 2,
      maxInboxItems: 3,
      maxTasks: 10,
      maxAiQuestionsPerMonth: 5,
      maxOwnedHouseholds: 1,
    },
    features: {
      module_ai_chat: true,
      module_inbox: false,
      module_tasks: false,
      /** Vue immo simple déjà en prod — conservée sur free ; affinages “bail pro” viendront plus tard. */
      module_real_estate: true,
      /** Module factures accessible en free (jusqu'à maxBills). */
      module_bills: true,
      module_multi_household: false,
      module_advanced_care: false,
    },
  },
  solo: {
    slug: "solo",
    label: "Solo",
    description: "Tout illimité : contrats, factures, questions IA.",
    quotas: {
      maxContracts: null,
      maxBills: null,
      maxInboxItems: null,
      maxTasks: null,
      maxAiQuestionsPerMonth: null,
      maxOwnedHouseholds: 1,
    },
    features: { ...soloFeatures },
  },
  family: {
    slug: "family",
    label: "Famille",
    description: "Plusieurs foyers et fonctions famille (évolution).",
    quotas: {
      maxContracts: null,
      maxBills: null,
      maxInboxItems: null,
      maxTasks: null,
      maxAiQuestionsPerMonth: null,
      maxOwnedHouseholds: 3,
    },
    features: {
      ...soloFeatures,
      module_multi_household: true,
    },
  },
  care: {
    slug: "care",
    label: "Care / Pro",
    description: "Niveau avancé et automatisations (évolution).",
    quotas: {
      maxContracts: null,
      maxBills: null,
      maxInboxItems: null,
      maxTasks: null,
      maxAiQuestionsPerMonth: null,
      maxOwnedHouseholds: 5,
    },
    features: {
      ...soloFeatures,
      module_multi_household: true,
      module_advanced_care: true,
    },
  },
}

const PLAN_ORDER: Record<PlanSlug, number> = {
  free: 0,
  solo: 1,
  family: 2,
  care: 3,
}

export function planMeetsMinimum(userPlan: PlanSlug, minimum: PlanSlug): boolean {
  return PLAN_ORDER[userPlan] >= PLAN_ORDER[minimum]
}

/** Limite contrats du plan gratuit — réexportée pour compat avec l’existant. */
export const FREE_PLAN_CONTRACT_LIMIT = PLANS.free.quotas.maxContracts ?? 2

/** Limite factures du plan gratuit. */
export const FREE_PLAN_BILL_LIMIT = PLANS.free.quotas.maxBills ?? 2

/** Limite questions IA mensuelles plan gratuit. */
export const FREE_PLAN_AI_QUESTIONS_LIMIT = PLANS.free.quotas.maxAiQuestionsPerMonth ?? 5

function normalizePriceId(id: string | null | undefined): string | null {
  if (!id || !id.trim()) return null
  return id.trim()
}

/**
 * Résout le plan à partir du price Stripe courant.
 * Variables supportées (priorité) : STRIPE_PRICE_ID_SOLO, STRIPE_PRICE_ID_FAMILY, STRIPE_PRICE_ID_CARE,
 * alias legacy STRIPE_PRICE_ID_MONTHLY → solo, STRIPE_PRO_PRICE_ID → care.
 */
export function resolvePlanSlugFromStripePriceId(priceId: string | null | undefined): PlanSlug {
  const pid = normalizePriceId(priceId)
  if (!pid) return "free"

  const solo =
    normalizePriceId(process.env.STRIPE_PRICE_ID_SOLO) ??
    normalizePriceId(process.env.STRIPE_PRICE_ID_MONTHLY)
  const family = normalizePriceId(process.env.STRIPE_PRICE_ID_FAMILY)
  const care =
    normalizePriceId(process.env.STRIPE_PRICE_ID_CARE) ??
    normalizePriceId(process.env.STRIPE_PRO_PRICE_ID)

  if (care && pid === care) return "care"
  if (family && pid === family) return "family"
  if (solo && pid === solo) return "solo"

  // Compat : anciens price IDs “pro” non listés explicitement
  if (pid.toLowerCase().includes("pro")) return "care"

  return "free"
}

export function getPlanDefinition(slug: PlanSlug): PlanDefinition {
  return PLANS[slug]
}

/** Abonnement Stripe actif considéré comme payant (hors free). */
export function isPaidPlanSlug(slug: PlanSlug): boolean {
  return slug !== "free"
}

export function getStripePriceIdForPlan(slug: PlanSlug): string | null {
  switch (slug) {
    case "solo":
      return normalizePriceId(process.env.STRIPE_PRICE_ID_SOLO) ?? normalizePriceId(process.env.STRIPE_PRICE_ID_MONTHLY)
    case "family":
      return normalizePriceId(process.env.STRIPE_PRICE_ID_FAMILY)
    case "care":
      return normalizePriceId(process.env.STRIPE_PRICE_ID_CARE) ?? normalizePriceId(process.env.STRIPE_PRO_PRICE_ID)
    case "free":
    default:
      return null
  }
}

export function getCheckoutPlanOptions(): Array<{ slug: PaidPlanSlug; label: string; description: string; priceId: string }> {
  const paidPlans: PaidPlanSlug[] = ["solo", "family", "care"]
  return paidPlans
    .map((slug) => {
      const def = getPlanDefinition(slug as PlanSlug)
      const priceId = getStripePriceIdForPlan(slug)
      return priceId
        ? {
            slug,
            label: def.label,
            description: def.description,
            priceId,
          }
        : null
    })
    .filter((x): x is { slug: PaidPlanSlug; label: string; description: string; priceId: string } => Boolean(x))
}
