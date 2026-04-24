import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getPropertySimulation, getRealEstatePropertyDetail } from "@/app/actions/real-estate"

export default async function PropertySimulationPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>
  searchParams: Promise<{ delta?: string }>
}) {
  const { propertyId } = await params
  const query = await searchParams
  const delta = Number(query.delta ?? "0")
  const detail = await getRealEstatePropertyDetail(propertyId)
  if (!detail) return notFound()
  const simulation = await getPropertySimulation(propertyId, Number.isFinite(delta) ? delta : 0)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{detail.property.name}</h1>
            <p className="text-sm text-muted-foreground">Étape 4/4 — Simulation d’impact si le taux évolue.</p>
          </div>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={`/real-estate/${propertyId}/statement`}>Retour décompte</Link>
          </Button>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="font-semibold text-sm mb-3">Scénarios rapides</h2>
          <div className="flex flex-wrap gap-2">
            {[-1, -0.5, 0, 0.5, 1].map((v) => (
              <Button key={v} asChild variant={v === delta ? "default" : "outline"} className="rounded-xl">
                <Link href={`/real-estate/${propertyId}/simulation?delta=${v}`}>{v > 0 ? `+${v}` : v} pt</Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Mensuel actuel</p>
            <p className="text-lg font-semibold">CHF {detail.finance.monthlyTotal.toLocaleString("fr-CH")}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Mensuel simulé</p>
            <p className="text-lg font-semibold">CHF {(simulation?.monthlyTotal ?? 0).toLocaleString("fr-CH")}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Impact mensuel</p>
            <p className="text-lg font-semibold">
              CHF {((simulation?.monthlyTotal ?? 0) - detail.finance.monthlyTotal).toLocaleString("fr-CH")}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
