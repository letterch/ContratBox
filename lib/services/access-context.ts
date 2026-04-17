import type { Session } from "next-auth"
import { prisma } from "@/lib/db"
import {
  resolvePlanSlugFromStripePriceId,
  type PlanSlug,
  getPlanDefinition,
} from "@/lib/config/plans"
import { getAppFeatures, type AppFeatures } from "@/lib/services/feature-flags"
import {
  buildEffectiveEntitlements,
  contractQuotaAllowsAdd,
  canUsePlanModule,
  mortgageSimulatorEffectiveAllowed,
  taskQuotaAllowsAdd,
  inboxQuotaAllowsAdd,
  type EffectiveEntitlements,
} from "@/lib/services/entitlements"
import { isPaidStripeSubscriptionRow } from "@/lib/services/subscription"

export type SubscriptionSnapshot = {
  status: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
}

export type AccessHouseholdSummary = {
  id: string
  name: string
  contractCount: number
  memberCount: number
}

/**
 * Contexte d’accès unique : plan, quotas, modules, foyer courant, admin plateforme.
 * Tous les contrôles métier futurs doivent s’appuyer sur cet objet (ou getAccessContext*).
 */
export type AccessContext = {
  userId: string
  email: string | null
  /** Rôle NextAuth / User : admin plateforme */
  isPlatformAdmin: boolean
  planSlug: PlanSlug
  /** Stripe actif + price ID reconnu comme offre payante */
  isPaidStripeSubscription: boolean
  entitlements: EffectiveEntitlements
  appFeatures: AppFeatures
  household: AccessHouseholdSummary | null
  /** Libellé plan pour l’UI (sidebar, facturation) */
  planLabel: string
  /** Abonnement Stripe persisté (webhook / admin) — peut être null */
  subscription: SubscriptionSnapshot | null
}

function sessionRole(session: Session | null): string | undefined {
  return (session?.user as { role?: string } | undefined)?.role
}

export async function getAccessContextForUser(
  userId: string,
  session: Session | null
): Promise<AccessContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
    },
  })
  if (!user) return null

  const [subscription, household, appFeatures] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      select: {
        status: true,
        stripePriceId: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    }),
    prisma.household.findFirst({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { contracts: true, members: true } },
      },
    }),
    getAppFeatures(),
  ])

  const planSlug = resolvePlanSlugFromStripePriceId(subscription?.stripePriceId)
  const isPaid = isPaidStripeSubscriptionRow(subscription)

  const entitlements = buildEffectiveEntitlements({
    planSlug,
    appFeatures,
  })

  const isPlatformAdmin =
    user.role === "admin" || sessionRole(session) === "admin"

  const planLabel = getPlanDefinition(planSlug).label

  return {
    userId: user.id,
    email: user.email,
    isPlatformAdmin,
    planSlug,
    isPaidStripeSubscription: isPaid,
    entitlements,
    appFeatures,
    planLabel,
    subscription: subscription
      ? {
          status: subscription.status,
          stripeCustomerId: subscription.stripeCustomerId,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          stripePriceId: subscription.stripePriceId,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        }
      : null,
    household: household
      ? {
          id: household.id,
          name: household.name,
          contractCount: household._count.contracts,
          memberCount: household._count.members,
        }
      : null,
  }
}

export function accessCanAddContract(ctx: AccessContext): boolean {
  if (!ctx.household) return false
  return contractQuotaAllowsAdd(ctx.entitlements, ctx.household.contractCount)
}

export function accessCanUseModule(ctx: AccessContext, key: Parameters<typeof canUsePlanModule>[1]): boolean {
  return canUsePlanModule(ctx.entitlements, key)
}

export function accessMortgageSimulatorAllowed(ctx: AccessContext): boolean {
  return mortgageSimulatorEffectiveAllowed(ctx.appFeatures, ctx.isPaidStripeSubscription)
}

export function accessTaskQuotaAllows(ctx: AccessContext, activeTaskCount: number): boolean {
  return taskQuotaAllowsAdd(ctx.entitlements, activeTaskCount)
}

export function accessInboxQuotaAllows(ctx: AccessContext, activeInboxCount: number): boolean {
  return inboxQuotaAllowsAdd(ctx.entitlements, activeInboxCount)
}
