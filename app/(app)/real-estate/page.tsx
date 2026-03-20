import { Building2, TrendingUp, TrendingDown, Scale } from "lucide-react"
import { getRealEstateOverview } from "@/app/actions/real-estate"

export default async function RealEstatePage() {
  const data = await getRealEstateOverview()
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Gestion immobilière</h1>
          <p className="text-sm text-muted-foreground">
            Vue simple des loyers (revenus) et frais immobiliers (charges) du ménage.
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
            <p className="text-2xl font-bold">
              CHF {(data?.netMonthly ?? 0).toLocaleString("fr-CH")}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
