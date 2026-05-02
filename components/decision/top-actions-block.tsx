import Link from "next/link"
import { ChevronRight, TrendingUp } from "lucide-react"
import type { ActionableRecommendation } from "@/lib/services/recommendation-engine"

const urgencyStyles: Record<string, { badge: string; label: string }> = {
  high: {
    badge: "bg-[oklch(0.57_0.20_25)]/15 text-[oklch(0.62_0.18_25)] border-[oklch(0.57_0.20_25)]/25",
    label: "Urgent",
  },
  medium: {
    badge: "bg-[oklch(0.70_0.15_60)]/15 text-[oklch(0.75_0.14_55)] border-[oklch(0.70_0.15_60)]/25",
    label: "Moyen",
  },
  low: {
    badge: "bg-muted text-muted-foreground border-border",
    label: "À suivre",
  },
}

export function TopActionsBlock({ actions }: { actions: ActionableRecommendation[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Top 3 actions · argent</h3>
      </div>
      {!actions.length ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center space-y-3">
          <p className="text-sm font-medium text-foreground">Aucune action détectée pour le moment</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Analysez un contrat pour obtenir vos recommandations, ou ajoutez des contrats avec renouvellement, délai de résiliation ou échéance hypothécaire dans les 60 prochains jours.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Link
              href="/ai"
              className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:opacity-95"
            >
              Ouvrir l’assistant IA
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-accent"
            >
              Importer un contrat
            </Link>
          </div>
        </div>
      ) : (
      <ul className="flex flex-col gap-3">
        {actions.map((a, i) => {
          const u = urgencyStyles[a.urgency] ?? urgencyStyles.low
          return (
            <li
              key={a.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-4"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground leading-snug">{a.title}</p>
                  {a.subtitle && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.subtitle}</p>}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-md border ${u.badge}`}>
                      {u.label}
                    </span>
                    <span className="text-xs font-semibold text-[oklch(0.56_0.15_162)]">
                      {a.impactChfYear > 0
                        ? `≈ CHF ${Math.round(a.impactChfYear).toLocaleString("fr-CH")} / an`
                        : "Impact à chiffrer"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Priorité {a.priorityScore}/100</span>
                  </div>
                </div>
              </div>
              <Link
                href={a.ctaHref}
                target={a.ctaHref.startsWith("http") ? "_blank" : undefined}
                rel={a.ctaHref.startsWith("http") ? "noopener noreferrer" : undefined}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors shrink-0"
              >
                {a.ctaLabel}
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </li>
          )
        })}
      </ul>
      )}
    </div>
  )
}
