import type { PlanFeatureKey, PlanQuotas, PlanSlug } from "@/lib/config/plans"
import { getPlanDefinition, planMeetsMinimum } from "@/lib/config/plans"
import type { AppFeatures } from "@/lib/services/feature-flags"

/** Capacités effectives après plan + règles plateforme (sans charge DB). */
export type EffectiveEntitlements = {
  planSlug: PlanSlug
  quotas: PlanQuotas
  /** Modules autorisés pour l’utilisateur (plan ∩ garde-fous globaux). */
  modules: Record<PlanFeatureKey, boolean>
}

export type EntitlementInput = {
  planSlug: PlanSlug
  appFeatures: AppFeatures
}

/**
 * Calcule quotas + modules à partir du plan et des flags globaux `app_features`.
 * Les toggles plateforme peuvent retirer une capacité même si le plan l’inclut.
 */
export function buildEffectiveEntitlements(input: EntitlementInput): EffectiveEntitlements {
  const def = getPlanDefinition(input.planSlug)
  const quotas = { ...def.quotas }
  const modules: Record<PlanFeatureKey, boolean> = { ...def.features }
  return {
    planSlug: input.planSlug,
    quotas,
    modules,
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
