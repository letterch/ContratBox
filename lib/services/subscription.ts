import { prisma } from "@/lib/db"
import { isPaidPlanSlug, resolvePlanSlugFromStripePriceId } from "@/lib/config/plans"
import { getAppFeatures } from "@/lib/services/feature-flags"
import { mortgageSimulatorEffectiveAllowed } from "@/lib/services/entitlements"

function isActiveStatus(status?: string | null): boolean {
  return status === "active" || status === "trialing"
}

/** Stripe subscription row : payant si actif/trialing et price ID résolu vers un plan ≠ free. */
export function isPaidStripeSubscriptionRow(input: {
  status?: string | null
  stripePriceId?: string | null
} | null | undefined): boolean {
  if (!input) return false
  if (!isActiveStatus(input.status)) return false
  const slug = resolvePlanSlugFromStripePriceId(input.stripePriceId)
  return isPaidPlanSlug(slug)
}

/**
 * Statut “Pro / payant” pour l’existant (admin, simulateur, etc.).
 * Inclut les comptes admin manuels (`pro_manual`) et la compatibilité price ID contenant "pro".
 */
export function isProSubscription(input: {
  status?: string | null
  stripePriceId?: string | null
}): boolean {
  if (!isActiveStatus(input.status)) return false
  const pid = input.stripePriceId
  if (!pid) return false
  if (pid === "pro_manual") return true
  if (isPaidStripeSubscriptionRow(input)) return true
  return pid.toLowerCase().includes("pro")
}

export async function canUseMortgageSimulatorForUser(userId: string): Promise<boolean> {
  const [subscription, appFeatures] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      select: { status: true, stripePriceId: true },
    }),
    getAppFeatures(),
  ])
  return mortgageSimulatorEffectiveAllowed(appFeatures, isPaidStripeSubscriptionRow(subscription))
}

function manualProStripePriceId(): string {
  return (
    process.env.STRIPE_PRO_PRICE_ID ??
    process.env.STRIPE_PRICE_ID_CARE ??
    process.env.STRIPE_PRICE_ID_SOLO ??
    process.env.STRIPE_PRICE_ID_MONTHLY ??
    "pro_manual"
  )
}

export async function setUserProAccess(userId: string, enabled: boolean) {
  const proPriceId = manualProStripePriceId()
  if (enabled) {
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        status: "active",
        stripePriceId: proPriceId,
      },
      update: {
        status: "active",
        stripePriceId: proPriceId,
      },
    })
    return
  }
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      status: "free",
      stripePriceId: null,
    },
    update: {
      status: "free",
      stripePriceId: null,
    },
  })
}
