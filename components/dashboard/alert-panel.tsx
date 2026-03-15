import Link from "next/link"
import { AlertTriangle, Clock, ChevronRight, Home } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type ContractAlert = {
  id: string
  provider?: string | null
  renewalDate?: Date | null
  cancellationDeadline?: Date | null
  maturityDate?: Date | null
}

type MortgageAlert = {
  id: string
  contractId: string
  provider: string
  trancheName: string
  annualRate: number
  maturityDate: Date
  daysLeft: number
}

export function AlertPanel({
  cancellationContracts = [],
  renewalContracts = [],
  mortgageAlerts = [],
}: {
  cancellationContracts?: ContractAlert[]
  renewalContracts?: ContractAlert[]
  mortgageAlerts?: MortgageAlert[]
}) {
  const alerts: { id: string; title: string; description: string; daysLeft: number; href: string; type: "urgent" | "warning" | "info"; icon: typeof AlertTriangle; color: string; bg: string; border: string }[] = []
  const now = new Date()
  for (const c of cancellationContracts) {
    const d = c.cancellationDeadline ? new Date(c.cancellationDeadline) : null
    if (!d || d < now) continue
    const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    alerts.push({
      id: c.id,
      title: c.provider ?? "Contrat",
      description: "Délai de résiliation",
      daysLeft,
      href: `/contracts/${c.id}`,
      type: daysLeft <= 14 ? "urgent" : "warning",
      icon: AlertTriangle,
      color: daysLeft <= 14 ? "text-[oklch(0.57_0.20_25)]" : "text-[oklch(0.70_0.15_60)]",
      bg: daysLeft <= 14 ? "bg-[oklch(0.57_0.20_25)]/8" : "bg-[oklch(0.70_0.15_60)]/8",
      border: daysLeft <= 14 ? "border-[oklch(0.57_0.20_25)]/20" : "border-[oklch(0.70_0.15_60)]/20",
    })
  }
  for (const c of renewalContracts) {
    if (alerts.some((a) => a.id === c.id)) continue
    const d = c.renewalDate ? new Date(c.renewalDate) : null
    if (!d || d < now) continue
    const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    alerts.push({
      id: c.id,
      title: c.provider ?? "Contrat",
      description: c.maturityDate ? "Échéance hypothèque" : "Renouvellement",
      daysLeft,
      href: `/contracts/${c.id}`,
      type: "info",
      icon: c.maturityDate ? Home : Clock,
      color: "text-[oklch(0.58_0.18_220)]",
      bg: "bg-[oklch(0.58_0.18_220)]/8",
      border: "border-[oklch(0.58_0.18_220)]/20",
    })
  }
  for (const m of mortgageAlerts) {
    alerts.push({
      id: m.id,
      title: m.provider,
      description: `Tranche ${m.trancheName} · ${m.annualRate.toFixed(2)}%`,
      daysLeft: m.daysLeft,
      href: `/contracts/${m.contractId}`,
      type: m.daysLeft <= 60 ? "warning" : "info",
      icon: Home,
      color: m.daysLeft <= 60 ? "text-[oklch(0.70_0.15_60)]" : "text-[oklch(0.58_0.18_220)]",
      bg: m.daysLeft <= 60 ? "bg-[oklch(0.70_0.15_60)]/8" : "bg-[oklch(0.58_0.18_220)]/8",
      border: m.daysLeft <= 60 ? "border-[oklch(0.70_0.15_60)]/20" : "border-[oklch(0.58_0.18_220)]/20",
    })
  }
  alerts.sort((a, b) => a.daysLeft - b.daysLeft)
  const urgentCount = alerts.filter((a) => a.type === "urgent").length

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card rounded-2xl border border-border shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground text-sm">Alertes & Échéances</h2>
          {urgentCount > 0 && (
            <Badge className="bg-[oklch(0.57_0.20_25)]/15 text-[oklch(0.57_0.20_25)] border-0 text-xs">{urgentCount} urgentes</Badge>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          {alerts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Aucune alerte pour l'instant.</p>
          ) : (
            alerts.slice(0, 5).map((a) => (
              <Link
                key={a.id}
                href={a.href}
                className={`rounded-xl ${a.bg} border ${a.border} p-3.5 flex items-center gap-3 hover:opacity-90 transition-opacity`}
              >
                <div className={`w-8 h-8 rounded-lg ${a.bg} flex items-center justify-center flex-shrink-0`}>
                  <a.icon className={`w-3.5 h-3.5 ${a.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-xs font-bold ${a.color}`}>{a.daysLeft}j</p>
                  <span className={`text-[10px] ${a.color} flex items-center gap-0.5`}>
                    Voir <ChevronRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card p-5">
        <h2 className="font-semibold text-foreground text-sm mb-4">Calendrier des échéances</h2>
        <div className="flex flex-col gap-3">
          {alerts.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucune échéance à venir.</p>
          ) : (
            alerts.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="w-1 h-1 rounded-full bg-border flex-shrink-0" />
                <Link href={a.href} className="text-xs text-muted-foreground hover:text-foreground">
                  {a.title} — {a.daysLeft}j
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
