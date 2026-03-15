type Breakdown = {
  key: string
  label: string
  monthly: number
}

type CostInsights = {
  monthlyTotal: number
  annualTotal: number
  breakdown: Breakdown[]
  suggestions: string[]
  optimizationScore: number
  potentialSavingsMonthly: number
  actionPlan: Array<{
    id: string
    title: string
    impactMonthly: number
    priority: "high" | "medium" | "low"
  }>
}

export function CostInsightsPanel({ insights }: { insights?: CostInsights | null }) {
  if (!insights) return null

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-semibold text-foreground text-sm">Vue globale des dépenses ménage</h2>
          <p className="text-xs text-muted-foreground">Suivi mensuel, annuel et pistes d’économies</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground">CHF {insights.monthlyTotal.toLocaleString("fr-CH")}/mois</p>
          <p className="text-[11px] text-muted-foreground">CHF {insights.annualTotal.toLocaleString("fr-CH")}/an</p>
        </div>
      </div>

      <div className="rounded-xl border border-border p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-foreground">Score optimisation ménage</p>
          <p className="text-sm font-semibold text-foreground">{insights.optimizationScore}/100</p>
        </div>
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-2">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.max(0, Math.min(100, insights.optimizationScore))}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Économies potentielles estimées: <span className="font-semibold text-foreground">CHF {insights.potentialSavingsMonthly.toLocaleString("fr-CH")}/mois</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {insights.breakdown.slice(0, 6).map((b) => (
          <div key={b.key} className="rounded-xl bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{b.label}</p>
            <p className="text-sm font-semibold text-foreground">CHF {b.monthly.toLocaleString("fr-CH")}/mois</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border p-3">
        <p className="text-xs font-medium text-foreground mb-2">Suggestions IA d’économies</p>
        <div className="flex flex-col gap-1.5">
          {insights.suggestions.slice(0, 3).map((s) => (
            <p key={s} className="text-xs text-muted-foreground">- {s}</p>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {insights.actionPlan.slice(0, 3).map((action) => (
          <div key={action.id} className="rounded-xl bg-muted/40 p-3">
            <p className="text-xs font-medium text-foreground">{action.title}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Impact: CHF {action.impactMonthly.toLocaleString("fr-CH")}/mois
            </p>
            <p className="text-[10px] mt-1 uppercase tracking-wider text-muted-foreground">
              Priorité {action.priority}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
