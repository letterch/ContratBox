import { Building2, ListTodo } from "lucide-react"
import { getRealEstateOverview, createRealEstateFollowUpTaskAction } from "@/app/actions/real-estate"
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
            <p className="text-xs text-muted-foreground">Contrats immobiliers</p>
            <p className="text-2xl font-bold">{data?.contractCount ?? 0}</p>
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

        {!!data?.contracts?.length && (
          <div className="bg-card rounded-2xl border border-border shadow-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Contrats et suivi
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Prochaine étape produit : extraction « bail » dédiée et courriers types. Ici vous pouvez déjà créer une
              tâche liée au contrat pour vos échéances et rappels.
            </p>
            <ul className="flex flex-col gap-2">
              {data.contracts.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {c.provider ?? c.title ?? "Contrat"} · {c.category}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.leaseEndDate ? `Fin / échéance : ${c.leaseEndDate}` : c.renewalDate ? `Renouvellement : ${c.renewalDate}` : "—"}
                    </p>
                  </div>
                  <form action={createRealEstateFollowUpTaskAction}>
                    <input type="hidden" name="contractId" value={c.id} />
                    <Button type="submit" size="sm" variant="secondary" className="rounded-xl gap-1 h-8 text-xs">
                      <ListTodo className="w-3.5 h-3.5" />
                      Tâche de suivi
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
