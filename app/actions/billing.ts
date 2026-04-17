"use server"

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
  createCheckoutSession,
  createCustomerPortalSession,
  getBillingSnapshot,
  getCheckoutOffers,
} from "@/lib/services/billing"
import { planMeetsMinimum, type PlanSlug } from "@/lib/config/plans"

export async function getBillingPageData() {
  const session = await auth()
  if (!session?.user?.id) return null
  const snapshot = await getBillingSnapshot(session.user.id)
  const offers = getCheckoutOffers()
  return {
    snapshot,
    offers,
    hasStripe: Boolean(process.env.STRIPE_SECRET_KEY),
  }
}

export async function startStripeCheckoutAction(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")
  const snap = await getBillingSnapshot(session.user.id)
  const requestedPlan = String(formData.get("planSlug") ?? "") as PlanSlug
  const offer = getCheckoutOffers().find((o) => o.slug === requestedPlan)
  if (!offer) {
    throw new Error("Offre indisponible : vérifiez les STRIPE_PRICE_ID_* de cet environnement")
  }
  if (snap.planSlug === requestedPlan) {
    throw new Error("Vous êtes déjà sur ce plan.")
  }
  if (planMeetsMinimum(snap.planSlug, requestedPlan)) {
    throw new Error("Downgrade à faire depuis le portail Stripe.")
  }
  const { url } = await createCheckoutSession({
    userId: session.user.id,
    email: snap.email,
    priceId: offer.priceId,
  })
  if (url) redirect(url)
}

export async function openStripePortalAction() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")
  const { url } = await createCustomerPortalSession({ userId: session.user.id })
  if (url) redirect(url)
}
