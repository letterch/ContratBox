import { ArrowRight, Wallet, TrendingDown, TrendingUp, Receipt, Building2 } from "lucide-react"
import Link from "next/link"
import type { PortfolioSummary, PropertyView } from "@/lib/services/real-estate/portfolio"
import { formatChf, formatPct } from "@/components/real-estate/format"

type Props = {
  summary: PortfolioSummary
  properties: PropertyView[]
}

export function PortfolioSummaryTab({ summary, properties }: Props) {
  const cashflowPositive = summary.monthlyNetCashflow >= 0
  const totalRows = properties.map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    isPrimary: p.isPrimaryResidence,
    monthlyTotalCost: p.finance.monthlyTotalCost,
    monthlyRentalIncome: p.monthlyRentalIncome,
    monthlyNetCashflow: p.monthlyNetCashflow,
  }))

  return (
    <div className="flex flex-col gap-5">
      {/* KPIs principaux : ce que vous payez vraiment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<Wallet className="w-4 h-4" />}
          label="Charges mensuelles totales"
          value={`CHF ${formatChf(summary.monthlyTotalCost)}`}
          sub={`${formatChf(summary.annualTotalCost)} / an · ${summary.propertyCount} bien${summary.propertyCount > 1 ? "s" : ""}`}
          accent="cost"
        />
        <KpiCard
          icon={<Receipt className="w-4 h-4" />}
          label="Loyers mensuels encaissés"
          value={`CHF ${formatChf(summary.monthlyRentalIncome)}`}
          sub={`${formatChf(summary.annualRentalIncome)} / an · ${summary.rentalCount} bien${summary.rentalCount > 1 ? "s" : ""} de rendement`}
          accent="income"
        />
        <KpiCard
          icon={cashflowPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          label="Solde net mensuel"
          value={`CHF ${formatChf(summary.monthlyNetCashflow, { sign: true })}`}
          sub={cashflowPositive ? "Vos biens couvrent leurs charges" : "Vous payez plus que vous ne recevez"}
          accent={cashflowPositive ? "income" : "cost"}
        />
        <KpiCard
          icon={<Building2 className="w-4 h-4" />}
          label="Patrimoine total"
          value={`CHF ${formatChf(summary.totalValuation)}`}
          sub={
            summary.totalCapitalGain != null
              ? `Plus-value cumulée CHF ${formatChf(summary.totalCapitalGain, { sign: true })}`
              : `Dette CHF ${formatChf(summary.totalDebt)}`
          }
        />
      </div>

      {/* Décomposition mensuelle des charges */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Décomposition des charges mensuelles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Breakdown
            label="Intérêts hypothécaires"
            value={summary.monthlyMortgageInterest}
            total={summary.monthlyTotalCost}
            tone="neutral"
          />
          <Breakdown
            label="Amortissement"
            value={summary.monthlyMortgageAmortization}
            total={summary.monthlyTotalCost}
            tone="neutral"
          />
          <Breakdown
            label="Charges PPE & frais"
            value={summary.monthlyExtraCharges}
            total={summary.monthlyTotalCost}
            tone="neutral"
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-4">
          Calcul : pour chaque bien, intérêts = somme(tranche × taux) ÷ 12 ; amortissement = dette × taux d&apos;amortissement (modifiable, défaut 1,25 %) ÷ 12 ; charges PPE = équivalent mensuel des frais récurrents. Le solde net soustrait les loyers encaissés.
        </p>
      </div>

      {/* Tableau bien par bien */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <header className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Détail par bien</h3>
          <p className="text-[11px] text-muted-foreground">
            Les loyers ne sont comptés que pour les biens marqués &quot;Bien de rendement&quot;.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground bg-muted/40">
                <th className="px-4 py-2 font-medium">Bien</th>
                <th className="px-4 py-2 font-medium text-right">Charges / mois</th>
                <th className="px-4 py-2 font-medium text-right">Loyers / mois</th>
                <th className="px-4 py-2 font-medium text-right">Solde net / mois</th>
                <th className="px-4 py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {totalRows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-foreground">{r.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {r.address ?? "Adresse non renseignée"} · {r.isPrimary ? "Domicile principal" : "Bien de rendement"}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                    CHF {formatChf(r.monthlyTotalCost)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">
                    {r.isPrimary ? "—" : `CHF ${formatChf(r.monthlyRentalIncome)}`}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right tabular-nums font-medium ${
                      r.monthlyNetCashflow >= 0 ? "text-emerald-600" : "text-destructive"
                    }`}
                  >
                    CHF {formatChf(r.monthlyNetCashflow, { sign: true })}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/real-estate/${r.id}/financing`}
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Détails
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
              {totalRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    Aucun bien dans votre patrimoine. Ajoutez-en un dans l&apos;onglet « Mes biens ».
                  </td>
                </tr>
              )}
            </tbody>
            {totalRows.length > 0 && (
              <tfoot>
                <tr className="bg-muted/40 font-semibold">
                  <td className="px-4 py-2.5 text-foreground">Total ménage</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">CHF {formatChf(summary.monthlyTotalCost)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">
                    CHF {formatChf(summary.monthlyRentalIncome)}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right tabular-nums ${
                      summary.monthlyNetCashflow >= 0 ? "text-emerald-600" : "text-destructive"
                    }`}
                  >
                    CHF {formatChf(summary.monthlyNetCashflow, { sign: true })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Vue patrimoine */}
      {summary.propertyCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <PatriCard label="Valeur totale d'achat" value={`CHF ${formatChf(summary.totalPurchaseValue)}`} />
          <PatriCard label="Valeur actuelle estimée" value={`CHF ${formatChf(summary.totalValuation)}`} />
          <PatriCard
            label="Plus-value latente"
            value={
              summary.totalCapitalGain != null
                ? `CHF ${formatChf(summary.totalCapitalGain, { sign: true })}`
                : "—"
            }
            sub={
              summary.totalCapitalGain != null && summary.totalPurchaseValue > 0
                ? formatPct((summary.totalCapitalGain * 100) / summary.totalPurchaseValue)
                : "Saisissez prix d'achat + valeur actuelle"
            }
            tone={summary.totalCapitalGain != null && summary.totalCapitalGain >= 0 ? "income" : "cost"}
          />
        </div>
      )}
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent?: "income" | "cost"
}) {
  const accentClass =
    accent === "income"
      ? "border-emerald-300/50 bg-emerald-50/40 dark:bg-emerald-900/20"
      : accent === "cost"
        ? "border-red-300/50 bg-red-50/40 dark:bg-red-900/20"
        : "border-border bg-card"
  return (
    <div className={`rounded-2xl border ${accentClass} p-4`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-[10px] uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-xl font-bold text-foreground mt-2">{value}</p>
      {sub ? <p className="text-[10px] text-muted-foreground mt-1">{sub}</p> : null}
    </div>
  )
}

function Breakdown({
  label,
  value,
  total,
  tone,
}: {
  label: string
  value: number
  total: number
  tone?: "neutral"
}) {
  const pct = total > 0 ? Math.min(100, (value * 100) / total) : 0
  return (
    <div className="rounded-xl border border-border/70 bg-background p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-semibold text-foreground mt-0.5">CHF {formatChf(value)}</p>
      <div className="mt-2 h-1.5 rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${tone === "neutral" ? "bg-primary" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">{pct.toFixed(0)} % des charges</p>
    </div>
  )
}

function PatriCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: "income" | "cost"
}) {
  const subClass =
    tone === "income"
      ? "text-emerald-600"
      : tone === "cost"
        ? "text-destructive"
        : "text-muted-foreground"
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-semibold text-foreground mt-1">{value}</p>
      {sub ? <p className={`text-[11px] mt-1 ${subClass}`}>{sub}</p> : null}
    </div>
  )
}
