"use client"

import { cn } from "@/lib/utils"
import {
  DASHBOARD_CATEGORY_GROUPS,
  type DashboardCategoryGroupId,
} from "@/lib/config/dashboard-filters"

type Member = { id: string; firstName: string; lastName?: string | null }

export function DashboardFilters({
  members,
  scope,
  onScopeChange,
  categoryGroup,
  onCategoryGroupChange,
  scopeTotals,
  groupTotals,
}: {
  members: Member[]
  scope: string
  onScopeChange: (id: string) => void
  categoryGroup: DashboardCategoryGroupId
  onCategoryGroupChange: (id: DashboardCategoryGroupId) => void
  scopeTotals: Record<string, { monthly: number; count: number }>
  groupTotals: Record<string, { monthly: number; count: number }>
}) {
  const scopeTabs: Array<{ id: string; label: string }> = [
    { id: "all", label: "Tout" },
    { id: "household", label: "Foyer" },
    ...members.map((m) => ({
      id: m.id,
      label: m.firstName,
    })),
  ]

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-4 sm:p-5 space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Qui paie ?
        </p>
        <div className="flex flex-wrap gap-2">
          {scopeTabs.map((tab) => {
            const tot = scopeTotals[tab.id]
            const active = scope === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onScopeChange(tab.id)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left transition-all min-w-[5.5rem]",
                  active
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                )}
              >
                <p className="text-xs font-semibold">{tab.label}</p>
                <p className="text-[10px] opacity-80">
                  CHF {Math.round(tot?.monthly ?? 0).toLocaleString("fr-CH")}/mois
                  {tot?.count != null ? ` · ${tot.count}` : ""}
                </p>
              </button>
            )
          })}
        </div>
        {scope !== "all" && scope !== "household" ? (
          <p className="text-[11px] text-muted-foreground mt-2">
            Vue personne : uniquement les contrats assignés à ce membre (hors contrats « foyer entier »).
          </p>
        ) : null}
        {scope === "household" ? (
          <p className="text-[11px] text-muted-foreground mt-2">
            Vue foyer : contrats partagés (ménage entier).
          </p>
        ) : null}
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Catégorie
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(DASHBOARD_CATEGORY_GROUPS) as DashboardCategoryGroupId[]).map((id) => {
            const g = DASHBOARD_CATEGORY_GROUPS[id]
            const tot = groupTotals[id]
            const active = categoryGroup === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onCategoryGroupChange(id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-all",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                )}
              >
                {g.label}
                {tot && tot.count > 0 ? (
                  <span className={cn("ml-1.5 opacity-80", active ? "opacity-90" : "")}>
                    · CHF {Math.round(tot.monthly).toLocaleString("fr-CH")}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
