import { Building2, Plus, Wallet, TrendingDown, TrendingUp } from "lucide-react"
import { createRealEstatePropertyAction, getRealEstatePortfolio } from "@/app/actions/real-estate"
import { Button } from "@/components/ui/button"
import { PortfolioTabs } from "@/components/real-estate/portfolio-tabs"
import { PropertyCard } from "@/components/real-estate/property-card"
import { LeasesTab } from "@/components/real-estate/leases-tab"
import { PortfolioSummaryTab } from "@/components/real-estate/portfolio-summary-tab"
import { formatChf } from "@/components/real-estate/format"

const inputClass =
  "rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/30"

export default async function RealEstatePage() {
  const data = await getRealEstatePortfolio()
  const properties = data?.properties ?? []
  const summary = data?.summary
  const rentalProperties = properties.filter((p) => !p.isPrimaryResidence)
  const leaseCount = properties.reduce((s, p) => s + p.leases.length, 0)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-5">
        {/* En-tête */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <h1 className="text-xl font-bold text-foreground">Gestion immobilière</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Pilotez votre portefeuille comme une régie : suivez la dette hypothécaire de chaque bien, l&apos;amortissement, les charges PPE et les loyers encaissés. La synthèse vous indique en un coup d&apos;œil ce que vous payez réellement chaque mois.
            </p>
          </div>
        </header>

        {/* Bandeau KPIs (toujours visible) */}
        {summary && summary.propertyCount > 0 ? (
          <HeaderKpis summary={summary} />
        ) : null}

        {/* Formulaire de création — toujours visible en haut */}
        <section className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <header className="flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Ajouter un bien</h2>
            <span className="text-[11px] text-muted-foreground">— bien de rendement ou domicile principal</span>
          </header>
          <form action={createRealEstatePropertyAction} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <label className="flex flex-col gap-1 lg:col-span-2">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Nom</span>
              <input name="name" required placeholder="ex: Orbe, Crissier" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 lg:col-span-2">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Adresse</span>
              <input name="address" placeholder="Rue, NPA, ville" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Usage</span>
              <select name="investmentKind" defaultValue="rental" className={inputClass}>
                <option value="rental">Bien de rendement</option>
                <option value="primary_residence">Domicile principal</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Type</span>
              <select name="propertyType" defaultValue="apartment" className={inputClass}>
                <option value="apartment">Appartement</option>
                <option value="house">Maison</option>
                <option value="mixed">Immeuble mixte</option>
                <option value="commercial">Commercial</option>
                <option value="other">Autre</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Valeur d&apos;achat (CHF)</span>
              <input name="purchaseValueChf" type="number" step="1" min="0" placeholder="850000" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Date d&apos;achat</span>
              <input name="purchaseDate" type="date" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Valeur actuelle (CHF)</span>
              <input name="valuationChf" type="number" step="1" min="0" placeholder="920000" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Mode amortissement</span>
              <select name="amortizationMode" defaultValue="direct" className={inputClass}>
                <option value="direct">Direct</option>
                <option value="indirect">Indirect (3e pilier)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Taux amort. (%)</span>
              <input name="amortizationRatePct" type="number" step="0.0001" defaultValue="1.25" className={inputClass} />
            </label>
            <div className="md:col-span-3 lg:col-span-6 flex justify-end">
              <Button type="submit" size="sm" className="rounded-lg gap-1 h-8 text-xs">
                <Plus className="w-3.5 h-3.5" />
                Créer le bien
              </Button>
            </div>
          </form>
        </section>

        {/* Onglets */}
        {properties.length === 0 ? (
          <EmptyState />
        ) : (
          <PortfolioTabs
            propertyCount={properties.length}
            leaseCount={leaseCount}
            propertiesTab={
              <div className="flex flex-col gap-4">
                {properties.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            }
            leasesTab={<LeasesTab rentalProperties={rentalProperties} allProperties={properties} />}
            summaryTab={summary ? <PortfolioSummaryTab summary={summary} properties={properties} /> : null}
          />
        )}
      </div>
    </div>
  )
}

function HeaderKpis({
  summary,
}: {
  summary: NonNullable<Awaited<ReturnType<typeof getRealEstatePortfolio>>>["summary"]
}) {
  const positive = summary.monthlyNetCashflow >= 0
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="w-4 h-4" />
          <p className="text-[10px] uppercase tracking-wide">Biens actifs</p>
        </div>
        <p className="text-xl font-bold text-foreground mt-2">{summary.propertyCount}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {summary.rentalCount} de rendement · {summary.primaryCount} domicile principal
        </p>
      </div>
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wallet className="w-4 h-4" />
          <p className="text-[10px] uppercase tracking-wide">Charges / mois</p>
        </div>
        <p className="text-xl font-bold text-[oklch(0.57_0.20_25)] mt-2">CHF {formatChf(summary.monthlyTotalCost)}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Banque + PPE · {formatChf(summary.annualTotalCost)} / an
        </p>
      </div>
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <TrendingUp className="w-4 h-4" />
          <p className="text-[10px] uppercase tracking-wide">Loyers / mois</p>
        </div>
        <p className="text-xl font-bold text-[oklch(0.56_0.15_162)] mt-2">CHF {formatChf(summary.monthlyRentalIncome)}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{formatChf(summary.annualRentalIncome)} / an</p>
      </div>
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {positive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <p className="text-[10px] uppercase tracking-wide">Solde net / mois</p>
        </div>
        <p
          className={`text-xl font-bold mt-2 ${
            positive ? "text-[oklch(0.56_0.15_162)]" : "text-[oklch(0.57_0.20_25)]"
          }`}
        >
          CHF {formatChf(summary.monthlyNetCashflow, { sign: true })}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {positive ? "Vos loyers couvrent vos charges" : "Vos charges dépassent les loyers"}
        </p>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center">
      <Building2 className="w-8 h-8 mx-auto text-muted-foreground" />
      <h3 className="text-sm font-semibold text-foreground mt-2">Aucun bien dans votre portefeuille</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
        Commencez par ajouter votre domicile principal ou un bien de rendement à l&apos;aide du formulaire ci-dessus. Vous pourrez ensuite saisir la dette hypothécaire (avec tranches), le taux d&apos;amortissement et les charges PPE.
      </p>
    </div>
  )
}
