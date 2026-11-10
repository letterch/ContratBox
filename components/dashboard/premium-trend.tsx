"use client"

import type { PremiumYearPoint } from "@/lib/services/premium-history"

export function PremiumTrend({ points }: { points: PremiumYearPoint[] }) {
  if (!points.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground">
        Historique des primes : dès que vous uploadez une nouvelle police (ex. 2027) en gardant l’ancienne année
        en historique, une courbe d’évolution apparaîtra ici.
      </div>
    )
  }

  if (points.length === 1) {
    const p = points[0]
    return (
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-card">
        <h3 className="text-sm font-semibold mb-1">Évolution des primes</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Une seule année enregistrée ({p.year}). Ajoutez la police de l’année suivante pour voir l’augmentation.
        </p>
        <p className="text-lg font-semibold">
          CHF {p.monthlyTotal.toLocaleString("fr-CH")}
          <span className="text-xs font-normal text-muted-foreground"> /mois · {p.year}</span>
        </p>
      </div>
    )
  }

  const max = Math.max(...points.map((p) => p.monthlyTotal), 1)
  const first = points[0]
  const last = points[points.length - 1]
  const delta = last.monthlyTotal - first.monthlyTotal
  const pct = first.monthlyTotal > 0 ? (delta / first.monthlyTotal) * 100 : 0

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-card">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold">Évolution des primes</h3>
          <p className="text-xs text-muted-foreground">
            Ménage entier · {first.year} → {last.year}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold ${delta > 0 ? "text-destructive" : "text-[oklch(0.56_0.15_162)]"}`}>
            {delta >= 0 ? "+" : ""}
            {delta.toLocaleString("fr-CH", { maximumFractionDigits: 2 })} CHF/mois
          </p>
          <p className="text-[10px] text-muted-foreground">
            {pct >= 0 ? "+" : ""}
            {pct.toFixed(1)} %
          </p>
        </div>
      </div>
      <div className="flex items-end gap-2 h-28">
        {points.map((p) => {
          const h = Math.max(8, Math.round((p.monthlyTotal / max) * 100))
          return (
            <div key={p.year} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-[10px] text-muted-foreground">
                {Math.round(p.monthlyTotal)}
              </span>
              <div
                className="w-full rounded-t-md bg-primary/80 min-h-[8px]"
                style={{ height: `${h}%` }}
                title={`${p.year}: CHF ${p.monthlyTotal}/mois`}
              />
              <span className="text-[10px] font-medium">{p.year}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
