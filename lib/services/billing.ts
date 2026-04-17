import { prisma } from "@/lib/db"
import Stripe from "stripe"
import {
  getCheckoutPlanOptions,
  getPlanDefinition,
  resolvePlanSlugFromStripePriceId,
  type PlanSlug,
} from "@/lib/config/plans"

export function getAppOrigin(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? process.env.NEXTAUTH_URL
  return (u ?? "http://localhost:3000").replace(/\/$/, "")
}

export function getDefaultCheckoutPriceId(): string | null {
  return (
    process.env.STRIPE_PRICE_ID_SOLO ??
    process.env.STRIPE_PRICE_ID_MONTHLY ??
    null
  )
}

export function getCheckoutOffers() {
  return getCheckoutPlanOptions()
}

export async function getBillingSnapshot(userId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  })
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  const planSlug = resolvePlanSlugFromStripePriceId(sub?.stripePriceId)
  const plan = getPlanDefinition(planSlug)
  return {
    email: user?.email ?? null,
    planSlug: planSlug as PlanSlug,
    planLabel: plan.label,
    planDescription: plan.description,
    quotas: plan.quotas,
    features: plan.features,
    subscription: sub
      ? {
          status: sub.status,
          stripeCustomerId: sub.stripeCustomerId,
          stripeSubscriptionId: sub.stripeSubscriptionId,
          stripePriceId: sub.stripePriceId,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        }
      : null,
  }
}

export async function createCheckoutSession(params: {
  userId: string
  email: string | null
  priceId: string
}): Promise<{ url: string | null }> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY manquant")
  const stripe = new Stripe(key, { typescript: true })
  const origin = getAppOrigin()

  const existing = await prisma.subscription.findUnique({
    where: { userId: params.userId },
    select: { stripeCustomerId: true },
  })

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/billing?checkout=cancel`,
    client_reference_id: params.userId,
    customer: existing?.stripeCustomerId ?? undefined,
    customer_email: existing?.stripeCustomerId ? undefined : params.email ?? undefined,
    metadata: { userId: params.userId },
    subscription_data: {
      metadata: { userId: params.userId },
    },
  })
  return { url: session.url }
}

export async function createCustomerPortalSession(params: { userId: string }): Promise<{ url: string | null }> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY manquant")
  const stripe = new Stripe(key, { typescript: true })
  const origin = getAppOrigin()

  const sub = await prisma.subscription.findUnique({
    where: { userId: params.userId },
    select: { stripeCustomerId: true },
  })
  if (!sub?.stripeCustomerId) throw new Error("Aucun client Stripe — souscrivez d’abord à une offre.")

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${origin}/billing`,
  })
  return { url: portal.url }
}
