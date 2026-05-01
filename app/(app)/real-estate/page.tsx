import Link from "next/link"
import { Building2, ListTodo, Landmark, ArrowRight } from "lucide-react"
import { getRealEstateOverview, createRealEstateFollowUpTaskAction, createRealEstatePropertyAction } from "@/app/actions/real-estate"
import { Button } from "@/components/ui/button"

export default async function RealEstatePage() {
  const data = await getRealEstateOverview()
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Gestion immobilière</h1>
          <p className="text-sm text-muted-foreground">
            Vue des loyers et charges liés aux contrats « bail » et « hypothèque ». Créez des tâches de suivi pour ne
            pas manquer une échéance (module Tâches requis).
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Biens actifs</p>
            <p className="text-2xl font-bold">{data?.propertyCount ?? 0}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Revenus mensuels</p>
            <p className="text-2xl font-bold text-[oklch(0.56_0.15_162)]">
              CHF {(data?.monthlyIncome ?? 0).toLocaleString("fr-CH")}
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Charges mensuelles</p>
            <p className="text-2xl font-bold text-[oklch(0.57_0.20_25)]">
              CHF {(data?.monthlyCharges ?? 0).toLocaleString("fr-CH")}
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Net mensuel</p>
            <p className="text-2xl font-bold">CHF {(data?.netMonthly ?? 0).toLocaleString("fr-CH")}</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Landmark className="w-4 h-4" />
            Ajouter un bien
          </h2>
          <form action={createRealEstatePropertyAction} className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input name="name" required placeholder="Nom du bien (ex: PPE Crissier)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <input name="address" placeholder="Adresse (optionnel)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <select name="propertyType" className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <option value="apartment">Appartement</option>
              <option value="house">Maison</option>
              <option value="mixed">Immeuble mixte</option>
              <option value="commercial">Commercial</option>
              <option value="other">Autre</option>
            </select>
            <input name="valuationChf" type="number" step="1" min="0" placeholder="Valeur CHF (optionnel)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <Button type="submit" className="rounded-xl">Créer</Button>
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
                    <p className="text-sm font-medium text-foreground">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.address ?? "Adresse non renseignée"} · Revenus CHF {p.monthlyIncome.toLocaleString("fr-CH")} / Charges CHF{" "}
                      {p.monthlyCharges.toLocaleString("fr-CH")} · Net CHF {p.netMonthly.toLocaleString("fr-CH")}
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
