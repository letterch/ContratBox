import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, FileText } from "lucide-react"
import { getKeyDateFromContractLike } from "@/lib/services/contract-key-date"

const statusConfig = {
  ok: { label: "Actif", class: "bg-[oklch(0.56_0.15_162)]/10 text-[oklch(0.56_0.15_162)] border-[oklch(0.56_0.15_162)]/20" },
  warning: { label: "Bientôt", class: "bg-[oklch(0.70_0.15_60)]/10 text-[oklch(0.70_0.15_60)] border-[oklch(0.70_0.15_60)]/20" },
  urgent: { label: "Urgent", class: "bg-[oklch(0.57_0.20_25)]/10 text-[oklch(0.57_0.20_25)] border-[oklch(0.57_0.20_25)]/20" },
}

type ContractRow = {
  id: string
  provider: string | null
  category: string | null
  member?: { firstName: string; lastName?: string | null } | null
  isHouseholdWide?: boolean
  premiumAmount?: { toNumber?: () => number } | number | null
  premiumFrequency?: string | null
  renewalDate?: Date | null
  maturityDate?: Date | null
  endDate?: Date | null
  cancellationDeadline?: Date | null
  rawExtraction?: unknown
}

function getKeyDate(c: ContractRow): Date | null {
  if (c.cancellationDeadline) return new Date(c.cancellationDeadline)
  return getKeyDateFromContractLike(c)
}

function getDateLabel(c: ContractRow): string {
  if (c.cancellationDeadline) return "Délai de résiliation"
  if (c.maturityDate) return "Échéance hypothécaire"
  if (c.endDate) return "Fin de contrat"
  if (c.renewalDate) return "Renouvellement"
  return "Date"
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-CH", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatRelative(daysLeft: number): string {
  if (daysLeft <= 0) return "Aujourd'hui"
  if (daysLeft === 1) return "Demain"
  return `Dans ${daysLeft} jours`
}

function getStatus(c: ContractRow): keyof typeof statusConfig {
  const renewal = c.renewalDate ? new Date(c.renewalDate) : null
  const maturity = c.maturityDate ? new Date(c.maturityDate) : null
  const cancel = c.cancellationDeadline ? new Date(c.cancellationDeadline) : null
  const now = new Date()
  if (cancel && cancel >= now) {
    const days = Math.ceil((cancel.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    if (days <= 14) return "urgent"
    return "warning"
  }
  if (renewal) {
    const days = Math.ceil((renewal.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    if (days <= 30) return "warning"
  }
  if (maturity) {
    const days = Math.ceil((maturity.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    if (days <= 90) return "warning"
  }
  return "ok"
}

export function RecentContracts({ contracts = [] }: { contracts?: ContractRow[] }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-card">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h2 className="font-semibold text-foreground text-sm">Contrats récents</h2>
        <Link href="/contracts" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
          Voir tous les contrats
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="divide-y divide-border">
        {contracts.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            Aucun contrat. <Link href="/upload" className="text-primary hover:underline">Ajoutez votre premier contrat</Link>.
          </div>
        ) : (
          contracts.map((c) => {
            const status = statusConfig[getStatus(c)]
            const amount = c.premiumAmount != null ? Number(c.premiumAmount) : null
            const memberLabel = c.isHouseholdWide ? "Ménage" : c.member ? `${c.member.firstName}${c.member.lastName ? ` ${c.member.lastName}` : ""}` : "—"
            const keyDate = getKeyDate(c)
            const daysLeft = keyDate
              ? Math.ceil((keyDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
              : null
            return (
              <Link
                key={c.id}
                href={`/contracts/${c.id}`}
                className="flex items-center gap-3 sm:gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors group"
              >
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.provider ?? "Sans nom"}</p>
                  <p className="text-xs text-muted-foreground">{c.category ?? "—"} · {memberLabel}</p>
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  <Badge variant="outline" className={`text-[10px] border ${status.class}`}>
                    {status.label}
                  </Badge>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">
                      {keyDate ? getDateLabel(c) : "Aucune date"}
                    </p>
                    <p className="text-xs text-foreground/80">
                      {keyDate ? formatDate(keyDate) : "—"}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-foreground">
                    {amount != null ? `CHF ${amount.toLocaleString("fr-CH")}` : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">/{c.premiumFrequency === "annual" ? "an" : "mois"}</p>
                  {daysLeft != null && daysLeft >= 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelative(daysLeft)}</p>
                  )}
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors hidden sm:block" />
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
