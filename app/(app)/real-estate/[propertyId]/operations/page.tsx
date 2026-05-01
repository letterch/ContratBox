import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  addPropertyChargeAction,
  createLeaseUnitAction,
  getRealEstatePropertyDetail,
  recordRentPaymentAction,
} from "@/app/actions/real-estate"
import {
  DeleteLeaseUnitButton,
  DeletePropertyChargeButton,
  DeleteRentPaymentButton,
  ResetPropertyOperationsButton,
} from "@/components/real-estate/operations-actions"

export default async function PropertyOperationsPage({
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
            <p className="text-sm text-muted-foreground">Étape 2/4 — Loyers encaissés et charges PPE/immeuble.</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end items-center">
            <ResetPropertyOperationsButton propertyId={propertyId} />
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/real-estate/${propertyId}/financing`}>Financement</Link>
            </Button>
            <Button asChild className="rounded-xl">
              <Link href={`/real-estate/${propertyId}/statement`}>Décompte</Link>
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="font-semibold text-sm mb-2">Ajouter une charge récurrente</h2>
          <form action={addPropertyChargeAction} className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input type="hidden" name="propertyId" value={propertyId} />
            <input name="label" placeholder="Ex: PPE, assurance bâtiment" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <select name="chargeType" className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <option value="ppe">PPE</option>
              <option value="maintenance">Entretien</option>
              <option value="insurance">Assurance</option>
              <option value="utilities">Énergie/eau</option>
              <option value="tax">Taxe</option>
              <option value="other">Autre</option>
            </select>
            <input type="number" name="amount" step="0.01" placeholder="Montant CHF" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <select name="frequency" className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <option value="monthly">Mensuel</option>
              <option value="quarterly">Trimestriel</option>
              <option value="annual">Annuel</option>
            </select>
            <Button type="submit" className="rounded-xl">Ajouter</Button>
          </form>
          <ul className="mt-3 text-sm flex flex-col gap-1">
            {detail.property.charges.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2">
                <span>
                  {c.label} · CHF {Number(c.amount).toLocaleString("fr-CH")} · {c.frequency}
                </span>
                <DeletePropertyChargeButton chargeId={c.id} />
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="font-semibold text-sm mb-2">Ajouter un lot / locataire</h2>
          <form action={createLeaseUnitAction} className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <input type="hidden" name="propertyId" value={propertyId} />
            <input name="label" placeholder="Lot" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <input name="tenantName" placeholder="Locataire" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <input type="number" name="rentMonthly" step="0.01" placeholder="Loyer mensuel CHF" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <input type="number" name="chargesMonthly" step="0.01" placeholder="Charges mensuelles CHF" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <select name="isRented" className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <option value="true">Loué</option>
              <option value="false">Vacant</option>
            </select>
            <Button type="submit" className="rounded-xl md:col-span-6">Ajouter le lot</Button>
          </form>
        </div>

        {detail.property.leases.map((lease) => (
          <div key={lease.id} className="bg-card rounded-2xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-sm">
                {lease.label} · {lease.tenantName ?? "Sans locataire"}
              </h3>
              <DeleteLeaseUnitButton leaseUnitId={lease.id} />
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Loyer CHF {Number(lease.rentMonthly).toLocaleString("fr-CH")} + Charges CHF{" "}
              {Number(lease.chargesMonthly).toLocaleString("fr-CH")}
            </p>
            <form action={recordRentPaymentAction} className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <input type="hidden" name="leaseUnitId" value={lease.id} />
              <input name="month" type="month" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <input name="expectedAmount" type="number" step="0.01" defaultValue={Number(lease.rentMonthly) + Number(lease.chargesMonthly)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <input name="receivedAmount" type="number" step="0.01" placeholder="Encaissé CHF" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <Button type="submit" className="rounded-xl">Enregistrer encaissement</Button>
            </form>
            <ul className="mt-3 text-sm flex flex-col gap-1">
              {lease.rentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2">
                  <span>
                    {p.month.toISOString().slice(0, 7)} · attendu CHF {Number(p.expectedAmount).toLocaleString("fr-CH")} · reçu CHF{" "}
                    {Number(p.receivedAmount).toLocaleString("fr-CH")} · {p.status}
                  </span>
                  <DeleteRentPaymentButton paymentId={p.id} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Rendement brut</p>
            <p className="text-lg font-semibold">{detail.yieldSummary.grossYieldPct.toFixed(2)}%</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Rendement net</p>
            <p className="text-lg font-semibold">{detail.yieldSummary.netYieldPct.toFixed(2)}%</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Cashflow mensuel</p>
            <p className="text-lg font-semibold">CHF {detail.yieldSummary.monthlyNetCashflow.toLocaleString("fr-CH")}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
