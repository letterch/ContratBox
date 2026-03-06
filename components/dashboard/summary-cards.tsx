import { TrendingDown, Calendar, FileText, AlertTriangle } from "lucide-react"

const cardTemplates = [
  {
    label: "Coût mensuel total",
    key: "monthly",
    sub: "Total des primes mensuelles",
    subColor: "text-muted-foreground",
    icon: TrendingDown,
    iconBg: "bg-primary/8",
    iconColor: "text-primary",
    accent: "from-primary/5 to-transparent",
  },
  {
    label: "Coût annuel total",
    key: "annual",
    sub: "Projeté sur 12 mois",
    subColor: "text-muted-foreground",
    icon: Calendar,
    iconBg: "bg-[oklch(0.58_0.18_220)]/8",
    iconColor: "text-[oklch(0.58_0.18_220)]",
    accent: "from-[oklch(0.58_0.18_220)]/5 to-transparent",
  },
  {
    label: "Contrats actifs",
    key: "contracts",
    sub: "Dans votre ménage",
    subColor: "text-muted-foreground",
    icon: FileText,
    iconBg: "bg-[oklch(0.56_0.15_162)]/8",
    iconColor: "text-[oklch(0.56_0.15_162)]",
    accent: "from-[oklch(0.56_0.15_162)]/5 to-transparent",
  },
  {
    label: "Alertes résiliation",
    key: "alerts",
    sub: "Dans les 30 prochains jours",
    subColor: "text-[oklch(0.57_0.20_25)]",
    icon: AlertTriangle,
    iconBg: "bg-[oklch(0.57_0.20_25)]/8",
    iconColor: "text-[oklch(0.57_0.20_25)]",
    accent: "from-[oklch(0.57_0.20_25)]/5 to-transparent",
  },
]

type SummaryCardsProps = {
  monthlyTotal?: number
  annualTotal?: number
  contractCount?: number
  alertCount?: number
}

export function SummaryCards({ monthlyTotal = 0, annualTotal = 0, contractCount = 0, alertCount = 0 }: SummaryCardsProps) {
  const values: Record<string, string> = {
    monthly: monthlyTotal ? `CHF ${monthlyTotal.toLocaleString("fr-CH")}` : "CHF 0",
    annual: annualTotal ? `CHF ${annualTotal.toLocaleString("fr-CH")}` : "CHF 0",
    contracts: String(contractCount),
    alerts: String(alertCount),
  }
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cardTemplates.map((card) => (
        <div
          key={card.label}
          className={`relative bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-card overflow-hidden group hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5`}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} pointer-events-none`} />
          <div className="relative">
            <div className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center mb-3`}>
              <card.icon className={`w-4 h-4 ${card.iconColor}`} />
            </div>
            <p className="text-xs text-muted-foreground mb-0.5 leading-tight">{card.label}</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{values[card.key]}</p>
            <p className={`text-[10px] sm:text-xs mt-1 ${card.subColor}`}>{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
