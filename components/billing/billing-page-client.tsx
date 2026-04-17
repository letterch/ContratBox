"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  getBillingPageData,
  openStripePortalAction,
  startStripeCheckoutAction,
} from "@/app/actions/billing"
import { PLAN_FEATURE_KEYS, planMeetsMinimum } from "@/lib/config/plans"

type BillingData = NonNullable<Awaited<ReturnType<typeof getBillingPageData>>>

export function BillingPageClient({ data }: { data: BillingData }) {
  const router = useRouter()
  const search = useSearchParams()
  useEffect(() => {
    if (search.get("checkout") === "success") {
      toast.success("Paiement reçu — synchronisation en cours.")
      const t = setTimeout(() => router.refresh(), 2000)
      return () => clearTimeout(t)
    }
    if (search.get("checkout") === "cancel") toast.message("Paiement annulé")
  }, [search, router])

  const { snapshot, offers, hasStripe } = data
  const sub = snapshot.subscription
  const showPortal = Boolean(sub?.stripeCustomerId) && hasStripe

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-4">
      <Card className="p-5 rounded-2xl border border-border shadow-card">
        <p className="text-sm text-muted-foreground mb-1">Plan affiché</p>
        <p className="text-lg font-semibold text-foreground">{snapshot.planLabel}</p>
        <p className="text-xs text-muted-foreground mt-2">{snapshot.planDescription}</p>
      </Card>

      <Card className="p-5 rounded-2xl border border-border shadow-card">
        <p className="text-sm text-muted-foreground mb-2">Abonnement Stripe</p>
        {sub ? (
          <ul className="text-xs text-foreground space-y-1">
            <li>Statut : {sub.status}</li>
            {sub.stripePriceId && <li>Price ID : {sub.stripePriceId}</li>}
            {sub.currentPeriodEnd && (
              <li>Période jusqu’au : {new Date(sub.currentPeriodEnd).toLocaleDateString("fr-CH")}</li>
            )}
            {sub.cancelAtPeriodEnd && <li className="text-amber-600">Résiliation en fin de période</li>}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Aucune ligne d’abonnement — compte gratuit ou première visite.</p>
        )}
      </Card>

      <Card className="p-5 rounded-2xl border border-border shadow-card">
        <p className="text-sm font-medium text-foreground mb-2">Limites du plan courant</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>Contrats max : {snapshot.quotas.maxContracts == null ? "Illimité" : snapshot.quotas.maxContracts}</li>
          <li>Inbox max : {snapshot.quotas.maxInboxItems == null ? "Illimité" : snapshot.quotas.maxInboxItems}</li>
          <li>Tâches max : {snapshot.quotas.maxTasks == null ? "Illimité" : snapshot.quotas.maxTasks}</li>
        </ul>
        <p className="text-sm font-medium text-foreground mt-4 mb-2">Modules inclus (plan)</p>
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {PLAN_FEATURE_KEYS.map((k) => (
            <li key={k}>
              {k.replace("module_", "")} : {snapshot.features[k] ? "oui" : "non"}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5 rounded-2xl border border-border shadow-card">
        <p className="text-sm font-medium text-foreground mb-3">Choisir une offre</p>
        <div className="flex flex-col gap-2">
          {offers.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucune offre Stripe configurée sur cet environnement.</p>
          )}
          {offers.map((offer) => {
            const isCurrent = snapshot.planSlug === offer.slug
            const isDowngrade = !isCurrent && planMeetsMinimum(snapshot.planSlug, offer.slug)
            return (
              <div key={offer.slug} className="rounded-xl border border-border/70 px-3 py-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{offer.label}</p>
                  <p className="text-[11px] text-muted-foreground">{offer.description}</p>
                  {isDowngrade && (
                    <p className="text-[11px] text-muted-foreground">Downgrade via portail Stripe</p>
                  )}
                </div>
                <form action={startStripeCheckoutAction}>
                  <input type="hidden" name="planSlug" value={offer.slug} />
                  <Button
                    type="submit"
                    size="sm"
                    className="rounded-xl h-8"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={!hasStripe || isCurrent || isDowngrade}
                  >
                    {isCurrent ? "Plan actuel" : isDowngrade ? "Via portail" : "Choisir"}
                  </Button>
                </form>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2">
        {showPortal && (
          <form action={openStripePortalAction} className="flex-1">
            <Button type="submit" variant="outline" className="w-full rounded-xl">
              Gérer upgrade / downgrade (Stripe)
            </Button>
          </form>
        )}
      </div>
      {!hasStripe && (
        <p className="text-xs text-amber-600">Stripe n’est pas configuré sur cet environnement.</p>
      )}
    </div>
  )
}
