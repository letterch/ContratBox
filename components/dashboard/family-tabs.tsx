"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"

type Member = { id: string; firstName: string; lastName?: string | null }
type Contract = {
  memberId?: string | null
  isHouseholdWide?: boolean
  premiumAmount?: unknown
  category?: string | null
  rawExtraction?: unknown
}

function getMonthlyCost(c: Contract): number {
  if (c.category === "rent_lease" && c.rawExtraction && typeof c.rawExtraction === "object") {
    const raw = c.rawExtraction as Record<string, unknown>
    const rent = Number(raw.leaseMonthlyRent ?? 0) || 0
    const charges = Number(raw.leaseMonthlyCharges ?? 0) || 0
    const total = rent + charges
    if (total > 0) return total
  }
  return Number((c as { premiumAmount?: number })?.premiumAmount) || 0
}

const defaultMembers = [
  { id: "all", name: "Tous", contracts: 0, cost: "CHF 0/mois", initials: null },
]

export function FamilyTabs({
  members: rawMembers = [],
  contracts = [],
  activeId,
  onChange,
}: {
  members?: Member[]
  contracts?: Contract[]
  activeId?: string
  onChange?: (id: string) => void
}) {
  const [internalActive, setInternalActive] = useState("all")
  const active = activeId ?? internalActive
  const members = useMemo(() => {
    if (rawMembers.length === 0) return defaultMembers
    const allCost = contracts.reduce((sum, c) => sum + getMonthlyCost(c), 0)
    const tabs = [
      { id: "all", name: "Tous", contracts: contracts.length, cost: `CHF ${allCost.toLocaleString("fr-CH")}/mois`, initials: null as string | null },
    ]
    for (const m of rawMembers) {
      const count = contracts.filter((c) => c.memberId === m.id).length
      const cost = contracts
        .filter((c) => c.memberId === m.id)
        .reduce((s, c) => s + getMonthlyCost(c), 0)
      tabs.push({
        id: m.id,
        name: `${m.firstName}${m.lastName ? ` ${m.lastName}` : ""}`,
        contracts: count,
        cost: `CHF ${cost.toLocaleString("fr-CH")}/mois`,
        initials: `${m.firstName[0]}${m.lastName?.[0] ?? ""}`.toUpperCase() || null,
      })
    }
    const householdCount = contracts.filter((c) => c.isHouseholdWide).length
    if (householdCount > 0 && tabs[0]) tabs[0].contracts = contracts.length
    return tabs
  }, [rawMembers, contracts])

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-5">
      <h2 className="font-semibold text-foreground text-sm mb-4">Membres du ménage</h2>
      <div className="flex gap-2 flex-wrap">
        {members.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              if (onChange) onChange(m.id)
              else setInternalActive(m.id)
            }}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all text-left",
              active === m.id
                ? "bg-primary text-primary-foreground border-primary shadow-brand"
                : "bg-muted/50 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
          >
            {m.initials ? (
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0",
                active === m.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {m.initials}
              </div>
            ) : null}
            <div>
              <p className="text-xs font-semibold leading-tight">{m.name}</p>
              <p className={cn("text-[10px] leading-tight", active === m.id ? "text-primary-foreground/60" : "text-muted-foreground/70")}>
                {m.contracts} contrats
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Membre actif: <span className="font-medium text-foreground">{members.find((m) => m.id === active)?.name}</span>
        </span>
        <span className="text-sm font-bold text-foreground">
          {members.find((m) => m.id === active)?.cost}
        </span>
      </div>
    </div>
  )
}
