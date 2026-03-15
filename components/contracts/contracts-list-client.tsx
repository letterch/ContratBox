"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, LayoutGrid, List, Filter, FileText, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { CONTRACT_CATEGORIES } from "@/lib/constants"

type ContractItem = {
  id: string
  provider: string | null
  contractType: string | null
  category: string | null
  premiumAmount: unknown
  premiumFrequency: string | null
  renewalDate: Date | null
  maturityDate?: Date | null
  cancellationDeadline: Date | null
  member?: { firstName: string; lastName?: string | null } | null
  isHouseholdWide?: boolean
}

const statusConfig = {
  ok: { label: "Actif", class: "bg-[oklch(0.56_0.15_162)]/10 text-[oklch(0.56_0.15_162)] border-[oklch(0.56_0.15_162)]/20" },
  warning: { label: "Bientôt", class: "bg-[oklch(0.70_0.15_60)]/10 text-[oklch(0.70_0.15_60)] border-[oklch(0.70_0.15_60)]/20" },
  urgent: { label: "Urgent", class: "bg-[oklch(0.57_0.20_25)]/10 text-[oklch(0.57_0.20_25)] border-[oklch(0.57_0.20_25)]/20" },
}

function getStatus(c: ContractItem): keyof typeof statusConfig {
  const cancel = c.cancellationDeadline ? new Date(c.cancellationDeadline) : null
  const renewal = c.renewalDate ? new Date(c.renewalDate) : null
  const maturity = c.maturityDate ? new Date(c.maturityDate) : null
  const now = new Date()
  if (cancel && cancel >= now) {
    const days = Math.ceil((cancel.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    if (days <= 14) return "urgent"
    return "warning"
  }
  if (renewal && renewal >= now) {
    const days = Math.ceil((renewal.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    if (days <= 30) return "warning"
  }
  if (maturity && maturity >= now) {
    const days = Math.ceil((maturity.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    if (days <= 90) return "warning"
  }
  return "ok"
}

export function ContractsListClient({
  contracts: initialContracts,
  categories: initialCategories,
  members,
}: {
  contracts: ContractItem[]
  categories: string[]
  members: { id: string; firstName: string; lastName?: string | null }[]
}) {
  const [view, setView] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("Toutes")
  const [activeMember, setActiveMember] = useState("Tous")

  const categories = ["Toutes", ...initialCategories]
  const memberNames = ["Tous", ...members.map((m) => `${m.firstName}${m.lastName ? ` ${m.lastName}` : ""}`)]

  const filtered = initialContracts.filter((c) => {
    const searchLower = search.toLowerCase()
    const matchSearch =
      !search ||
      (c.provider?.toLowerCase().includes(searchLower) ?? false) ||
      (c.contractType?.toLowerCase().includes(searchLower) ?? false)
    const matchCat = activeCategory === "Toutes" || c.category === activeCategory
    const memberLabel = c.isHouseholdWide ? "Ménage" : c.member ? `${c.member.firstName} ${c.member.lastName ?? ""}`.trim() : ""
    const matchMember = activeMember === "Tous" || memberLabel.includes(activeMember)
    return matchSearch && matchCat && matchMember
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/60 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">Mes contrats</h1>
            <p className="text-xs text-muted-foreground">
              {filtered.length} contrat{filtered.length !== 1 ? "s" : ""} trouvé{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("grid")}
              className={cn("p-2 rounded-xl transition-colors", view === "grid" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn("p-2 rounded-xl transition-colors", view === "list" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5 pb-32 lg:pb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un contrat, un prestataire..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl border-border"
            />
          </div>
          <Button variant="outline" size="sm" className="h-10 gap-2 rounded-xl">
            <Filter className="w-3.5 h-3.5" />
            Filtres
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {cat === "Toutes" ? cat : CONTRACT_CATEGORIES[cat as keyof typeof CONTRACT_CATEGORIES] ?? cat}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {memberNames.map((m) => (
            <button
              key={m}
              onClick={() => setActiveMember(m)}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-medium transition-all",
                activeMember === m ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground mb-1">Aucun contrat trouvé</p>
              <p className="text-sm text-muted-foreground">Essayez d'autres filtres ou ajoutez votre premier contrat.</p>
            </div>
            <Button asChild className="rounded-xl bg-primary text-primary-foreground shadow-brand">
              <Link href="/upload">Ajouter un contrat</Link>
            </Button>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => {
              const status = statusConfig[getStatus(c)]
              const amount = c.premiumAmount != null ? Number(c.premiumAmount) : null
              const memberLabel = c.isHouseholdWide ? "Ménage" : c.member ? `${c.member.firstName} ${c.member.lastName ?? ""}`.trim() : "—"
              const daysLeft = c.renewalDate
                ? Math.ceil((new Date(c.renewalDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
                : c.maturityDate
                  ? Math.ceil((new Date(c.maturityDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
                : null
              return (
                <Link
                  key={c.id}
                  href={`/contracts/${c.id}`}
                  className="bg-card rounded-2xl border border-border p-5 shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5 group flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] border", status.class)}>
                      {status.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{c.provider ?? "Sans nom"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.contractType ?? c.category ?? "—"}</p>
                  </div>
                  <div className="flex items-end justify-between mt-auto pt-3 border-t border-border">
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {amount != null ? `CHF ${amount.toLocaleString("fr-CH")}` : "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">/{c.premiumFrequency === "annual" ? "an" : "mois"}</p>
                    </div>
                    <div className="text-right">
                      {daysLeft != null && (
                        <p className={cn("text-xs font-medium flex items-center gap-1", daysLeft <= 30 ? "text-[oklch(0.57_0.20_25)]" : daysLeft <= 60 ? "text-[oklch(0.70_0.15_60)]" : "text-muted-foreground")}>
                          <Clock className="w-3 h-3" />
                          {daysLeft}j
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {c.renewalDate
                          ? new Date(c.renewalDate).toLocaleDateString("fr-CH")
                          : c.maturityDate
                            ? new Date(c.maturityDate).toLocaleDateString("fr-CH")
                            : "—"}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-card divide-y divide-border overflow-hidden">
            {filtered.map((c) => {
              const status = statusConfig[getStatus(c)]
              const amount = c.premiumAmount != null ? Number(c.premiumAmount) : null
              const memberLabel = c.isHouseholdWide ? "Ménage" : c.member ? `${c.member.firstName} ${c.member.lastName ?? ""}`.trim() : "—"
              return (
                <Link key={c.id} href={`/contracts/${c.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.provider ?? "Sans nom"}</p>
                    <p className="text-xs text-muted-foreground">{c.contractType ?? c.category ?? "—"}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] border hidden sm:flex", status.class)}>
                    {status.label}
                  </Badge>
                  <div className="hidden md:block text-xs text-muted-foreground">{memberLabel}</div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">
                      {amount != null ? `CHF ${amount.toLocaleString("fr-CH")}` : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">/{c.premiumFrequency === "annual" ? "an" : "mois"}</p>
                  </div>
                  <span className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors hidden sm:block" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
