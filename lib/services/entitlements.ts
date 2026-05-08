import type { PlanFeatureKey, PlanQuotas, PlanSlug } from "@/lib/config/plans"
import { getPlanDefinition, planMeetsMinimum, PLAN_FEATURE_KEYS } from "@/lib/config/plans"
import type { AppFeatures } from "@/lib/services/feature-flags"

/** Capacités effectives après plan + règles plateforme (sans charge DB). */
export type EffectiveEntitlements = {
  planSlug: PlanSlug
  quotas: PlanQuotas
  /** Modules autorisés pour l’utilisateur (plan ∩ garde-fous globaux ∪ overrides admin). */
  modules: Record<PlanFeatureKey, boolean>
  /** Surcharge admin du quota IA mensuel (si non null). */
  aiQuotaOverride?: number | null
}

export type EntitlementInput = {
  planSlug: PlanSlug
  appFeatures: AppFeatures
  /** Modules octroyés manuellement par un admin à l'utilisateur. */
  extraModules?: string[]
  /** Surcharge admin du quota IA mensuel. */
  aiQuotaOverride?: number | null
}

/**
 * Calcule quotas + modules à partir du plan, des flags globaux et des overrides admin.
 * Les toggles plateforme peuvent retirer une capacité même si le plan l'inclut.
 * Les `extraModules` ajoutent des modules au-delà du plan (utile pour les "early access").
 */
export function buildEffectiveEntitlements(input: EntitlementInput): EffectiveEntitlements {
  const def = getPlanDefinition(input.planSlug)
  const quotas = { ...def.quotas }
  const modules: Record<PlanFeatureKey, boolean> = { ...def.features }
  if (input.extraModules?.length) {
    for (const m of input.extraModules) {
      if ((PLAN_FEATURE_KEYS as readonly string[]).includes(m)) {
        modules[m as PlanFeatureKey] = true
      }
    }
  }
  if (input.aiQuotaOverride != null && Number.isFinite(input.aiQuotaOverride) && input.aiQuotaOverride > 0) {
    quotas.maxAiQuestionsPerMonth = input.aiQuotaOverride
  }
  return {
    planSlug: input.planSlug,
    quotas,
    modules,
    aiQuotaOverride: input.aiQuotaOverride ?? null,
  }
}

/** Peut créer un nouveau contrat compte tenu du quota et du plan. */
export function contractQuotaAllowsAdd(
  entitlements: EffectiveEntitlements,
  currentContractCount: number
): boolean {
  const max = entitlements.quotas.maxContracts
  if (max == null) return true
  return currentContractCount < max
}

/** Tâches non archivées. */
export function taskQuotaAllowsAdd(entitlements: EffectiveEntitlements, activeTaskCount: number): boolean {
  const max = entitlements.quotas.maxTasks
  if (max == null) return true
  return activeTaskCount < max
}

export function inboxQuotaAllowsAdd(entitlements: EffectiveEntitlements, activeInboxCount: number): boolean {
  const max = entitlements.quotas.maxInboxItems
  if (max == null) return true
  return activeInboxCount < max
}

/** Peut créer une nouvelle facture compte tenu du quota du plan. */
export function billQuotaAllowsAdd(
  entitlements: EffectiveEntitlements,
  currentBillCount: number
): boolean {
  const max = entitlements.quotas.maxBills
  if (max == null) return true
  return currentBillCount < max
}

/** Peut poser une nouvelle question IA ce mois-ci. */
export function aiQuotaAllowsQuestion(
  entitlements: EffectiveEntitlements,
  currentMonthQuestionCount: number
): boolean {
  const max = entitlements.quotas.maxAiQuestionsPerMonth
  if (max == null) return true
  return currentMonthQuestionCount < max
}

/** Accès minimal à une route module (ex. inbox). */
export function canUsePlanModule(
  entitlements: EffectiveEntitlements,
  key: PlanFeatureKey,
  options?: { minimumPlan?: PlanSlug }
): boolean {
  if (options?.minimumPlan && !planMeetsMinimum(entitlements.planSlug, options.minimumPlan)) {
    return false
  }
  return Boolean(entitlements.modules[key])
}

/** Gate simulateur hypothèque (flags globaux + statut payant Stripe). */
export function mortgageSimulatorEffectiveAllowed(
  appFeatures: AppFeatures,
  isPaidStripeSubscription: boolean
): boolean {
  if (!appFeatures.mortgageSimulatorEnabled) return false
  if (appFeatures.mortgageSimulatorProOnly && !isPaidStripeSubscription) return false
  return true
}
