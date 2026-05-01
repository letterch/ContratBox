import Link from "next/link"
import { Building2, ListTodo, Landmark, ArrowRight } from "lucide-react"
import { getRealEstateOverview, createRealEstateFollowUpTaskAction, createRealEstatePropertyAction } from "@/app/actions/real-estate"
import { Button } from "@/components/ui/button"
import { investmentKindLabel } from "@/lib/services/real-estate/investment-kind"

export default async function RealEstatePage() {
  const data = await getRealEstateOverview()
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Gestion immobilière</h1>
          <p className="text-sm text-muted-foreground">
            Distinction nette entre domicile principal et bien de rendement : les loyers du tableau ci-dessous ne comptent que les biens locatifs ; les charges agrègent tous les biens (hypothèques incluses).
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Biens actifs</p>
            <p className="text-2xl font-bold">{data?.propertyCount ?? 0}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Loyers mensuels (biens de rendement)</p>
            <p className="text-2xl font-bold text-[oklch(0.56_0.15_162)]">
              CHF {(data?.monthlyIncome ?? 0).toLocaleString("fr-CH")}
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Charges mensuelles (tous biens)</p>
            <p className="text-2xl font-bold text-[oklch(0.57_0.20_25)]">
              CHF {(data?.monthlyCharges ?? 0).toLocaleString("fr-CH")}
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Solde indicatif</p>
            <p className="text-2xl font-bold">CHF {(data?.netMonthly ?? 0).toLocaleString("fr-CH")}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Loyers locatifs − charges totales patrimoine</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Landmark className="w-4 h-4" />
            Ajouter un bien
          </h2>
          <form action={createRealEstatePropertyAction} className="flex flex-col gap-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input name="name" required placeholder="Nom (ex: Orbe, Crissier)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <input name="address" placeholder="Adresse (optionnel)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <select name="propertyType" className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
                <option value="apartment">Appartement</option>
                <option value="house">Maison</option>
                <option value="mixed">Immeuble mixte</option>
                <option value="commercial">Commercial</option>
                <option value="other">Autre</option>
              </select>
              <select name="investmentKind" className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
                <option value="rental">Bien de rendement</option>
                <option value="primary_residence">Domicile principal</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <input name="valuationChf" type="number" step="1" min="0" placeholder="Valeur CHF (optionnel)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <Button type="submit" className="rounded-xl w-fit">
                Créer le bien
              </Button>
            </div>
          </form>
        </div>

        {!!data?.properties?.length && (
          <div className="bg-card rounded-2xl border border-border shadow-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Biens et suivi
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              1 bien = 1 écran dédié. Configurez le financement, les loyers/charges, puis générez le décompte locatif.
            </p>
            <ul className="flex flex-col gap-2">
              {data.properties.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground flex flex-wrap items-center gap-2">
                      {p.name}
                      <span className="text-[10px] font-normal rounded-full border border-border px-1.5 py-px text-muted-foreground">
                        {investmentKindLabel(p.investmentKind)}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.address ?? "Adresse non renseignée"} · Loyers CHF {p.monthlyIncome.toLocaleString("fr-CH")} / Charges CHF{" "}
                      {p.monthlyCharges.toLocaleString("fr-CH")} · Solde CHF {p.netMonthly.toLocaleString("fr-CH")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={createRealEstateFollowUpTaskAction}>
                      <input type="hidden" name="propertyId" value={p.id} />
                      <Button type="submit" size="sm" variant="secondary" className="rounded-xl gap-1 h-8 text-xs">
                        <ListTodo className="w-3.5 h-3.5" />
                        Tâche de suivi
                      </Button>
                    </form>
                    <Button asChild size="sm" className="rounded-xl gap-1 h-8 text-xs">
                      <Link href={`/real-estate/${p.id}/financing`}>
                        Ouvrir
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
