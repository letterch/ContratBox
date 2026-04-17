import { requireAccessContext } from "@/lib/guards/require-access"
import { Card } from "@/components/ui/card"

export default async function BillingPage() {
  const { ctx } = await requireAccessContext()

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-xl mx-auto flex flex-col gap-4">
        <h1 className="text-xl font-bold text-foreground">Facturation & offre</h1>
        <Card className="p-5 rounded-2xl border border-border shadow-card">
          <p className="text-sm text-muted-foreground mb-2">Plan actuel</p>
          <p className="text-lg font-semibold text-foreground">{ctx.planLabel}</p>
          <p className="text-xs text-muted-foreground mt-3">
            Le portail client Stripe (changement d’offre, factures) sera branché ici. Les droits produit suivent déjà
            votre abonnement synchronisé côté serveur.
          </p>
        </Card>
      </div>
    </div>
  )
}
