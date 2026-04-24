import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  generateChargeStatementAction,
  getRealEstatePropertyDetail,
  markChargeStatementNextLetterIntentAction,
} from "@/app/actions/real-estate"
import { buildChargeStatementNextLetterUrl } from "@/lib/services/nextletter"

export default async function PropertyStatementPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  const detail = await getRealEstatePropertyDetail(propertyId)
  if (!detail) return notFound()

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{detail.property.name}</h1>
            <p className="text-sm text-muted-foreground">Étape 3/4 — Décompte de charges suisse + envoi recommandé NextLetter.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/real-estate/${propertyId}/operations`}>Loyers & charges</Link>
            </Button>
            <Button asChild className="rounded-xl">
              <Link href={`/real-estate/${propertyId}/simulation`}>Simulation taux</Link>
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="font-semibold text-sm mb-2">Générer un décompte</h2>
          <form action={generateChargeStatementAction} className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input type="hidden" name="propertyId" value={propertyId} />
            <input name="periodStart" type="date" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <input name="periodEnd" type="date" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <input name="tenantAllocationPct" type="number" step="0.01" defaultValue="100" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <input name="provisionsPaidByTenant" type="number" step="0.01" defaultValue="0" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <Button type="submit" className="rounded-xl">Générer</Button>
          </form>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="font-semibold text-sm mb-2">Décomptes générés</h2>
          <ul className="flex flex-col gap-2">
            {detail.property.chargeStatements.map((s) => {
              const payload = s.payload as {
                periodStart: string
                periodEnd: string
                tenantName?: string | null
                totalCharges: number
                totalProvisions: number
                balance: number
              }
              const link = buildChargeStatementNextLetterUrl({
                propertyName: detail.property.name,
                tenantName: payload.tenantName ?? null,
                periodStart: payload.periodStart,
                periodEnd: payload.periodEnd,
                totalCharges: Number(payload.totalCharges ?? 0),
                totalProvisions: Number(payload.totalProvisions ?? 0),
                balance: Number(payload.balance ?? 0),
              })
              return (
                <li key={s.id} className="rounded-xl border border-border/60 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      Période {s.periodStart.toISOString().slice(0, 10)} → {s.periodEnd.toISOString().slice(0, 10)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Charges CHF {Number(s.totalChargesAmount).toLocaleString("fr-CH")} · Provisions CHF{" "}
                      {Number(s.totalProvisionsAmount).toLocaleString("fr-CH")} · Solde CHF {Number(s.balanceAmount).toLocaleString("fr-CH")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild className="rounded-xl">
                      <a href={link} target="_blank" rel="noreferrer">
                        Ouvrir NextLetter
                      </a>
                    </Button>
                    <form action={markChargeStatementNextLetterIntentAction}>
                      <input type="hidden" name="statementId" value={s.id} />
                      <Button type="submit" variant="outline" className="rounded-xl">
                        Marquer \"envoyé\"
                      </Button>
                    </form>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
