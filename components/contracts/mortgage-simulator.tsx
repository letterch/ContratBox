"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Tranche = {
  name: string
  principal: number
  annualRate: number
  durationMonths: number
  amortizationType: "direct" | "indirect" | "none"
}

type Props = {
  tranches: Tranche[]
  baselineInterest: number
  baselineAmortization: number
}

function estimateTranche(principal: number, rate: number, months: number, amortizationType: "direct" | "indirect" | "none") {
  const years = Math.max(0, months) / 12
  if (amortizationType === "direct") {
    const interest = (principal / 2) * (rate / 100) * years
    return { interest, amortization: principal, total: interest + principal }
  }
  if (amortizationType === "indirect") {
    const interest = principal * (rate / 100) * years
    return { interest, amortization: principal, total: interest + principal }
  }
  const interest = principal * (rate / 100) * years
  return { interest, amortization: 0, total: interest }
}

export function MortgageSimulator({ tranches, baselineInterest, baselineAmortization }: Props) {
  const weightedCurrentRate = useMemo(() => {
    const total = tranches.reduce((sum, t) => sum + t.principal, 0)
    if (!total) return 1.5
    const weighted = tranches.reduce((sum, t) => sum + t.principal * t.annualRate, 0) / total
    return Number(weighted.toFixed(3))
  }, [tranches])

  const [proposedRate, setProposedRate] = useState(String(weightedCurrentRate))
  const [amortizationType, setAmortizationType] = useState<"direct" | "indirect" | "none">("direct")

  const projection = useMemo(() => {
    const rate = Number(proposedRate.replace(",", "."))
    if (!Number.isFinite(rate) || rate < 0) return null
    const totals = tranches.reduce(
      (acc, t) => {
        const p = estimateTranche(t.principal, rate, t.durationMonths, amortizationType)
        return {
          interest: acc.interest + p.interest,
          amortization: acc.amortization + p.amortization,
          total: acc.total + p.total,
        }
      },
      { interest: 0, amortization: 0, total: 0 }
    )
    const baselineTotal = baselineInterest + baselineAmortization
    return {
      ...totals,
      savingsInterest: baselineInterest - totals.interest,
      savingsTotal: baselineTotal - totals.total,
    }
  }, [tranches, proposedRate, amortizationType, baselineInterest, baselineAmortization])

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-5">
      <h3 className="font-semibold text-foreground text-sm mb-1">Simulateur hypothécaire (option)</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Comparez un nouveau taux et un mode d’amortissement pour estimer vos économies.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Taux proposé (%)</p>
          <Input
            value={proposedRate}
            onChange={(e) => setProposedRate(e.target.value)}
            type="number"
            step="0.001"
            className="rounded-xl h-9 text-sm"
          />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Amortissement simulé</p>
          <Select value={amortizationType} onValueChange={(v) => setAmortizationType(v as "direct" | "indirect" | "none")}>
            <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="direct">Direct</SelectItem>
              <SelectItem value="indirect">Indirect</SelectItem>
              <SelectItem value="none">Aucun</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!projection ? (
        <p className="text-xs text-destructive">Taux invalide.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Intérêts simulés</p>
            <p className="text-sm font-semibold">CHF {projection.interest.toLocaleString("fr-CH")}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Amortissement simulé</p>
            <p className="text-sm font-semibold">CHF {projection.amortization.toLocaleString("fr-CH")}</p>
          </div>
          <div className="rounded-xl bg-[oklch(0.56_0.15_162)]/8 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Économie intérêts</p>
            <p className="text-sm font-semibold text-[oklch(0.56_0.15_162)]">
              CHF {projection.savingsInterest.toLocaleString("fr-CH")}
            </p>
          </div>
          <div className="rounded-xl bg-[oklch(0.58_0.18_220)]/8 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Économie totale</p>
            <p className="text-sm font-semibold text-[oklch(0.58_0.18_220)]">
              CHF {projection.savingsTotal.toLocaleString("fr-CH")}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
