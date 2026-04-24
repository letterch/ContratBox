import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  addMortgageTrancheAction,
  createMortgageLoanAction,
  getPropertySimulation,
  getRealEstatePropertyDetail,
  syncMortgageMaturityTasksAction,
  updateRealEstatePropertyAction,
} from "@/app/actions/real-estate"

export default async function PropertyFinancingPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  const detail = await getRealEstatePropertyDetail(propertyId)
  if (!detail) return notFound()

  const simulationUp = await getPropertySimulation(propertyId, 0.5)
  const simulationDown = await getPropertySimulation(propertyId, -0.5)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{detail.property.name}</h1>
            <p className="text-sm text-muted-foreground">
              Étape 1/4 — Financement hypothécaire. Puis loyers/charges, décompte et simulation.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/real-estate/${propertyId}/operations`}>Loyers & charges</Link>
            </Button>
            <Button asChild className="rounded-xl">
              <Link href={`/real-estate/${propertyId}/statement`}>Décompte</Link>
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="font-semibold text-sm mb-2">Informations du bien</h2>
          <form action={updateRealEstatePropertyAction} className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input type="hidden" name="propertyId" value={propertyId} />
            <input name="name" defaultValue={detail.property.name} className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <input name="address" defaultValue={detail.property.address ?? ""} className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <select name="propertyType" defaultValue={detail.property.propertyType} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <option value="apartment">Appartement</option>
              <option value="house">Maison</option>
              <option value="mixed">Immeuble mixte</option>
              <option value="commercial">Commercial</option>
              <option value="other">Autre</option>
            </select>
            <Button type="submit" className="rounded-xl">Mettre à jour</Button>
          </form>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="font-semibold text-sm mb-2">Ajouter une dette hypothécaire</h2>
          <form action={createMortgageLoanAction} className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input type="hidden" name="propertyId" value={propertyId} />
            <input name="label" placeholder="Label prêt" defaultValue="Dette hypothécaire" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <select name="loanKind" defaultValue="mortgage" className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <option value="mortgage">Dette hypothécaire (intérêts)</option>
              <option value="amortization">Amortissement</option>
            </select>
            <select name="amortizationMode" defaultValue="direct" className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <option value="direct">Amortissement direct</option>
              <option value="indirect">Amortissement indirect</option>
            </select>
            <input name="principalTotal" type="number" step="0.01" placeholder="Dette totale CHF" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <input name="amortizationRatePct" type="number" step="0.0001" defaultValue="1.25" placeholder="Taux amortissement %" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <Button type="submit" className="rounded-xl">Créer le prêt</Button>
          </form>
        </div>

        {detail.property.mortgageLoans.map((loan) => (
          <div key={loan.id} className="bg-card rounded-2xl border border-border p-4">
            <h3 className="font-semibold text-sm">{loan.label}</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {loan.loanKind === "amortization" ? "Amortissement" : "Hypothèque"} · Dette CHF {Number(loan.principalTotal).toLocaleString("fr-CH")} ·
              Taux par défaut {Number(loan.amortizationRatePct)}% · {loan.amortizationMode}
            </p>
            <form action={addMortgageTrancheAction} className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-4">
              <input type="hidden" name="loanId" value={loan.id} />
              <input name="name" placeholder="Tranche" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <input name="principal" type="number" step="0.01" placeholder="Capital CHF" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <select name="rateType" className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
                <option value="fixed">Fixe</option>
                <option value="saron">SARON</option>
              </select>
              <input name="ratePct" type="number" step="0.0001" placeholder="Taux %" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <input name="endDate" type="date" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <Button type="submit" className="rounded-xl">Ajouter tranche</Button>
            </form>
            <ul className="text-sm flex flex-col gap-1">
              {loan.tranches.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
                  <span>
                    {t.name ?? "Tranche"} · CHF {Number(t.principal).toLocaleString("fr-CH")} · {Number(t.ratePct)}% · {t.rateType} ·
                    échéance {t.endDate ? t.endDate.toISOString().slice(0, 10) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Charges mensuelles actuelles</p>
            <p className="text-lg font-semibold">CHF {detail.finance.monthlyTotal.toLocaleString("fr-CH")}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Intérêts mensuels (hypothèque)</p>
            <p className="text-lg font-semibold">CHF {detail.finance.monthlyInterest.toLocaleString("fr-CH")}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Amortissement mensuel total</p>
            <p className="text-lg font-semibold">CHF {detail.finance.monthlyAmortization.toLocaleString("fr-CH")}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Simulation taux +0.50%</p>
            <p className="text-lg font-semibold">CHF {(simulationUp?.monthlyTotal ?? 0).toLocaleString("fr-CH")}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Simulation taux -0.50%</p>
            <p className="text-lg font-semibold">CHF {(simulationDown?.monthlyTotal ?? 0).toLocaleString("fr-CH")}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Amort. direct / indirect</p>
            <p className="text-lg font-semibold">
              CHF {detail.finance.monthlyAmortizationDirect.toLocaleString("fr-CH")} / CHF{" "}
              {detail.finance.monthlyAmortizationIndirect.toLocaleString("fr-CH")}
            </p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Synchroniser les rappels d’échéance hypothécaire vers les tâches.
          </p>
          <form action={syncMortgageMaturityTasksAction}>
            <input type="hidden" name="propertyId" value={propertyId} />
            <Button type="submit" variant="outline" className="rounded-xl">
              Générer les rappels
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
