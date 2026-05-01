import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  addPropertyChargeAction,
  createLeaseUnitAction,
  getRealEstatePropertyDetail,
  recordRentPaymentAction,
  updatePropertyValuationAction,
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
          <h2 className="font-semibold text-sm mb-2">Valeur du bien et rendement</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Indiquez le prix d’achat ou une valeur estimée du bien en CHF (distinct de la dette hypothécaire). C’est le dénominateur pour les rendements affichés plus bas.
            Pour les décomptes officiels locatif / provisions et envoi au locataire ou à la fiduciaire, utilisez l’étape{" "}
            <Link href={`/real-estate/${propertyId}/statement`} className="underline underline-offset-2">
              Décompte
            </Link>
            .
          </p>
          <form action={updatePropertyValuationAction} className="flex flex-wrap gap-2 items-end">
            <input type="hidden" name="propertyId" value={propertyId} />
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted-foreground">Valeur du bien CHF (prix d’achat ou estimée)</label>
              <input
                name="valuationChf"
                type="number"
                step="1"
                min="0"
                placeholder="ex: 850000"
                defaultValue={detail.property.valuationChf != null ? Number(detail.property.valuationChf) : ""}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm w-44 min-w-[11rem]"
              />
            </div>
            <Button type="submit" variant="outline" className="rounded-xl">
              Enregistrer la valeur
            </Button>
          </form>
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

        <div className="bg-muted/40 rounded-2xl border border-border/80 p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-medium text-foreground text-sm">Comment sont calculés ces indicateurs</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              Rendement brut : (loyer mensuel contractuel + charges mensuelles du bail pour les lots loués) × 12 ÷ valeur du bien. Potentiel contractuel, hors impayés.
            </li>
            <li>
              Rendement net : (cash-flow mensuel × 12) ÷ valeur du bien. Cash-flow = encaissements réels moyens par mois calendaire enregistré (somme reçue ÷ nombre de mois concernés), moins toutes les charges propriétaire mensuelles (hypothèque, amortissement, PPE / frais saisis).
            </li>
            <li>Sans valeur de bien renseignée, les rendements restent vides (évite les pourcentages aberrants).</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Rendement brut</p>
            <p className="text-lg font-semibold">
              {detail.yieldSummary.grossYieldPct != null ? `${detail.yieldSummary.grossYieldPct.toFixed(2)} %` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Contractuel : CHF {detail.yieldSummary.monthlyRentalPotential.toLocaleString("fr-CH")} / mois loué
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Rendement net</p>
            <p className="text-lg font-semibold">
              {detail.yieldSummary.netYieldPct != null ? `${detail.yieldSummary.netYieldPct.toFixed(2)} %` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Sur base encaissements : CHF {detail.yieldSummary.monthlyRentalReceived.toLocaleString("fr-CH")} / mois · Charges CHF{" "}
              {detail.yieldSummary.monthlyPropertyCharges.toLocaleString("fr-CH")} / mois
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Cashflow mensuel</p>
            <p className="text-lg font-semibold">CHF {detail.yieldSummary.monthlyNetCashflow.toLocaleString("fr-CH")}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Encaissements moyens − charges propriétaire totales</p>
          </div>
        </div>
      </div>
    </div>
  )
}
