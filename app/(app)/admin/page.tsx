"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users, FileText, TrendingUp, AlertTriangle,
  ArrowUpRight, Zap, Download, RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FeatureFlagsCard } from "@/components/admin/feature-flags-card"
import { ProUsersManager } from "@/components/admin/pro-users-manager"

const kpis = [
  { label: "Utilisateurs", value: "Pilotage live", delta: "", icon: Users, color: "text-primary", bg: "bg-primary/8" },
  { label: "Contrats", value: "Vision globale", delta: "", icon: FileText, color: "text-[oklch(0.56_0.15_162)]", bg: "bg-[oklch(0.56_0.15_162)]/8" },
  { label: "Abonnements", value: "Actifs / Pro", delta: "", icon: TrendingUp, color: "text-[oklch(0.58_0.18_220)]", bg: "bg-[oklch(0.58_0.18_220)]/8" },
  { label: "Options", value: "Locataire/Propriétaire", delta: "", icon: AlertTriangle, color: "text-warning", bg: "bg-warning/8" },
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

        {(activeTab === "overview" || activeTab === "users") && <ProUsersManager />}

        {(activeTab === "overview" || activeTab === "contracts") && (
          <div className="bg-card rounded-2xl border border-border shadow-card p-5">
            <h2 className="font-semibold text-foreground text-sm mb-2">Pilotage contrats</h2>
            <p className="text-xs text-muted-foreground">
              Le pilotage détaillé est disponible via la gestion utilisateurs (statut Pro, options locataire/propriétaire, admin)
              et les feature flags ci-dessous.
            </p>
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

            <FeatureFlagsCard />
            <div className="lg:col-span-2">
              <ProUsersManager />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
