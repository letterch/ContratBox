"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Users, FileText, TrendingUp, AlertTriangle, Search, ChevronDown,
  ArrowUpRight, Shield, Zap, MoreHorizontal, Download, RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

const kpis = [
  { label: "Utilisateurs actifs", value: "4 821", delta: "+12%", icon: Users, color: "text-primary", bg: "bg-primary/8" },
  { label: "Contrats gérés", value: "38 940", delta: "+8%", icon: FileText, color: "text-[oklch(0.56_0.15_162)]", bg: "bg-[oklch(0.56_0.15_162)]/8" },
  { label: "Revenu mensuel", value: "CHF 47 720", delta: "+15%", icon: TrendingUp, color: "text-[oklch(0.58_0.18_220)]", bg: "bg-[oklch(0.58_0.18_220)]/8" },
  { label: "Tickets ouverts", value: "23", delta: "-5%", icon: AlertTriangle, color: "text-warning", bg: "bg-warning/8" },
]

const recentUsers = [
  { name: "Marc Dupont", email: "marc@dupont.ch", plan: "Premium", contracts: 12, joined: "03 mars 2026", status: "Actif" },
  { name: "Sophie Laurent", email: "sophie.l@gmail.com", plan: "Free", contracts: 3, joined: "02 mars 2026", status: "Actif" },
  { name: "Jean-Pierre Müller", email: "jp.muller@bluewin.ch", plan: "Premium", contracts: 8, joined: "01 mars 2026", status: "Suspendu" },
  { name: "Isabelle Rochat", email: "i.rochat@me.com", plan: "Premium", contracts: 15, joined: "28 fév. 2026", status: "Actif" },
  { name: "Kevin Andrade", email: "k.andrade@swisscom.ch", plan: "Free", contracts: 2, joined: "27 fév. 2026", status: "Actif" },
  { name: "Nathalie Favre", email: "n.favre@outlook.com", plan: "Premium", contracts: 9, joined: "25 fév. 2026", status: "Actif" },
]

const recentContracts = [
  { user: "Marc Dupont", provider: "Swisscom SA", category: "Télécom", amount: "CHF 89/mois", confidence: 97, date: "Aujourd'hui" },
  { user: "Sophie Laurent", provider: "AXA Assurances", category: "Assurances", amount: "CHF 124/mois", confidence: 94, date: "Aujourd'hui" },
  { user: "Isabelle Rochat", provider: "UBS Hypothèque", category: "Immobilier", amount: "CHF 1'450/mois", confidence: 99, date: "Hier" },
  { user: "Kevin Andrade", provider: "Migros Cumulus", category: "Abonnements", amount: "CHF 15/mois", confidence: 88, date: "Hier" },
]

const alerts = [
  { type: "error", title: "Extraction échouée", desc: "3 documents n'ont pas pu être analysés — format non supporté.", time: "Il y a 15 min" },
  { type: "warning", title: "Pic d'utilisation IA", desc: "Le modèle répond avec 2.4s de latence (seuil: 2s).", time: "Il y a 1h" },
  { type: "info", title: "Migration base de données", desc: "La migration v2.3 a été appliquée avec succès sur prod.", time: "Il y a 3h" },
]

type AdminTab = "overview" | "users" | "contracts" | "system"

const adminTabs: { id: AdminTab; label: string }[] = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "users", label: "Utilisateurs" },
  { id: "contracts", label: "Contrats" },
  { id: "system", label: "Système" },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview")
  const [search, setSearch] = useState("")

  const filteredUsers = recentUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/60 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-base font-bold text-foreground">Administration</h1>
              <Badge className="text-[10px] bg-primary/10 text-primary border-0 px-2">Admin</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Supervision de la plateforme ContratBox</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 hidden sm:flex">
              <Download className="w-3.5 h-3.5" />
              Exporter
            </Button>
            <Button size="sm" className="rounded-xl text-xs gap-1.5 bg-primary text-primary-foreground shadow-brand">
              <RefreshCw className="w-3.5 h-3.5" />
              Actualiser
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-background/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 overflow-x-auto">
          {adminTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-card rounded-2xl border border-border shadow-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                <div className={cn(
                  "flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full",
                  kpi.delta.startsWith("+")
                    ? "text-[oklch(0.56_0.15_162)] bg-[oklch(0.56_0.15_162)]/10"
                    : "text-warning bg-warning/10"
                )}>
                  <ArrowUpRight className={cn("w-3 h-3", !kpi.delta.startsWith("+") && "rotate-90")} />
                  {kpi.delta}
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground leading-none mb-1">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          ))}
        </div>

        {(activeTab === "overview" || activeTab === "users") && (
          <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground text-sm">
                {activeTab === "overview" ? "Derniers inscrits" : "Tous les utilisateurs"}
              </h2>
              <div className="flex items-center gap-2">
                <div className="relative hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher..."
                    className="pl-8 h-8 text-xs rounded-xl w-44 bg-muted border-0"
                  />
                </div>
                <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1 h-8">
                  Filtrer <ChevronDown className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Utilisateur</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Plan</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Contrats</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Inscription</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Statut</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <tr key={user.email} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-primary">
                              {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm leading-tight">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <Badge className={cn(
                          "text-[10px] border-0",
                          user.plan === "Premium"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {user.plan}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-foreground hidden lg:table-cell">{user.contracts}</td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground hidden lg:table-cell">{user.joined}</td>
                      <td className="px-4 py-3.5">
                        <Badge className={cn(
                          "text-[10px] border-0",
                          user.status === "Actif"
                            ? "bg-[oklch(0.56_0.15_162)]/10 text-[oklch(0.56_0.15_162)]"
                            : "bg-destructive/10 text-destructive"
                        )}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <button className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activeTab === "overview" || activeTab === "contracts") && (
          <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground text-sm">Contrats récemment ajoutés</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Utilisateur</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Prestataire</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Catégorie</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Montant</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Confiance IA</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentContracts.map((c, i) => (
                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-foreground">{c.user}</td>
                      <td className="px-4 py-3.5 text-sm text-foreground">{c.provider}</td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <Badge className="text-[10px] bg-muted text-muted-foreground border-0">{c.category}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-foreground hidden lg:table-cell">{c.amount}</td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                c.confidence >= 95 ? "bg-[oklch(0.56_0.15_162)]" : c.confidence >= 88 ? "bg-[oklch(0.70_0.15_60)]" : "bg-warning"
                              )}
                              style={{ width: `${c.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{c.confidence}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{c.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activeTab === "overview" || activeTab === "system") && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* System alerts */}
            <div className="bg-card rounded-2xl border border-border shadow-card p-5">
              <h2 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Alertes système
              </h2>
              <div className="flex flex-col gap-2.5">
                {alerts.map((a, i) => (
                  <div key={i} className={cn(
                    "flex gap-3 p-3 rounded-xl border",
                    a.type === "error" ? "bg-destructive/5 border-destructive/15" :
                    a.type === "warning" ? "bg-warning/5 border-warning/15" :
                    "bg-[oklch(0.58_0.18_220)]/5 border-[oklch(0.58_0.18_220)]/15"
                  )}>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                      a.type === "error" ? "bg-destructive" : a.type === "warning" ? "bg-warning" : "bg-[oklch(0.58_0.18_220)]"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{a.desc}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System health */}
            <div className="bg-card rounded-2xl border border-border shadow-card p-5">
              <h2 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Santé du système
              </h2>
              <div className="flex flex-col gap-3">
                {[
                  { service: "API principale", status: "Opérationnel", uptime: "99.98%", latency: "42ms", ok: true },
                  { service: "Extraction IA", status: "Dégradé", uptime: "98.2%", latency: "2.4s", ok: false },
                  { service: "Base de données", status: "Opérationnel", uptime: "100%", latency: "8ms", ok: true },
                  { service: "Notifications", status: "Opérationnel", uptime: "99.7%", latency: "120ms", ok: true },
                  { service: "Stockage documents", status: "Opérationnel", uptime: "99.9%", latency: "65ms", ok: true },
                ].map((s) => (
                  <div key={s.service} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", s.ok ? "bg-[oklch(0.56_0.15_162)]" : "bg-warning animate-pulse")} />
                      <div>
                        <p className="text-sm font-medium text-foreground leading-tight">{s.service}</p>
                        <p className={cn("text-[10px]", s.ok ? "text-muted-foreground" : "text-warning")}>{s.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-foreground">{s.latency}</p>
                      <p className="text-[10px] text-muted-foreground">{s.uptime} uptime</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
