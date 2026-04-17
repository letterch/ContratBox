import Stripe from "stripe"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

function mapStripeSubscriptionStatus(s: Stripe.Subscription.Status): string {
  switch (s) {
    case "active":
      return "active"
    case "trialing":
      return "trialing"
    case "past_due":
      return "past_due"
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
    case "paused":
      return "cancelled"
    case "incomplete":
      return "past_due"
    default:
      return "free"
  }
}

async function handleSubscriptionEvent(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id
  if (!customerId) return

  const priceId = sub.items.data[0]?.price?.id ?? null
  const metadataUserId = sub.metadata?.userId

  const existing = await prisma.subscription.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: sub.id },
        { stripeCustomerId: customerId },
        ...(metadataUserId ? [{ userId: metadataUserId }] : []),
      ],
    },
  })

  if (!existing && !metadataUserId) {
    console.warn("[stripe webhook] Pas de ligne Subscription et pas de metadata.userId", sub.id)
    return
  }

  const userId = existing?.userId ?? metadataUserId!
  const status = mapStripeSubscriptionStatus(sub.status)

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      status,
      currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      status,
      currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    },
  })
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const key = process.env.STRIPE_SECRET_KEY
  if (!secret || !key) {
    return new Response(JSON.stringify({ ok: false, error: "stripe_not_configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }

  const stripe = new Stripe(key, { typescript: true })
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")
  if (!sig) return new Response("Signature manquante", { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (e) {
    console.error("[stripe webhook] signature", e)
    return new Response("Signature invalide", { status: 400 })
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription)
        break
      default:
        break
    }
  } catch (e) {
    console.error("[stripe webhook] handler", e)
    return new Response("Erreur handler", { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}
