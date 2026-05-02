"use client"

import { useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, Check, X } from "lucide-react"
import { completeReminder, dismissReminder } from "@/app/actions/reminders"
import { Button } from "@/components/ui/button"
import type { PendingReminderLite } from "@/lib/services/reminder-sync"

type Row = Omit<PendingReminderLite, "dueDate"> & { dueDate: Date | string }

function formatDue(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d
  return dt.toLocaleDateString("fr-CH", { day: "2-digit", month: "short", year: "numeric" })
}

export function RemindersPanel({ reminders }: { reminders: Row[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const onDismiss = (id: string) => {
    start(async () => {
      await dismissReminder(id)
      router.refresh()
    })
  }
  const onDone = (id: string) => {
    start(async () => {
      await completeReminder(id)
      router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Alertes &amp; échéances</h3>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Rappels actifs</span>
      </div>
      {!reminders.length ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center space-y-3">
          <p className="text-sm font-medium text-foreground">Aucun rappel en attente</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Les rappels apparaissent quand une échéance (renouvellement, résiliation, hypothèque) est détectée. Vous pouvez aussi en créer depuis l’assistant après une analyse.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Button variant="default" size="sm" className="rounded-xl h-9 text-xs" asChild>
              <Link href="/ai">Assistant IA</Link>
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs" asChild>
              <Link href="/upload">Importer un contrat</Link>
            </Button>
          </div>
        </div>
      ) : (
      <ul className="flex flex-col gap-3">
        {reminders.map((r) => (
          <li
            key={r.id}
            className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 rounded-xl border border-border/70 bg-muted/15 p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{r.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
              <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">{formatDue(r.dueDate)}</span>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary font-medium">{r.urgencyLevel}</span>
                {r.estimatedImpactChfYear != null && r.estimatedImpactChfYear > 0 && (
                  <span className="rounded-md bg-[oklch(0.56_0.15_162)]/12 px-2 py-0.5 text-[oklch(0.52_0.14_162)] font-medium">
                    ≈ CHF {Math.round(r.estimatedImpactChfYear).toLocaleString("fr-CH")} / an
                  </span>
                )}
              </div>
              {r.contractId && (
                <Link href={`/contracts/${r.contractId}`} className="text-xs text-primary font-medium mt-2 inline-block hover:underline">
                  Voir le contrat
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl h-8 gap-1 text-xs"
                disabled={pending}
                onClick={() => onDismiss(r.id)}
              >
                <X className="w-3.5 h-3.5" />
                Ignorer
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-xl h-8 gap-1 text-xs"
                disabled={pending}
                onClick={() => onDone(r.id)}
              >
                <Check className="w-3.5 h-3.5" />
                Marquer comme fait
              </Button>
            </div>
          </li>
        ))}
      </ul>
      )}
    </div>
  )
}
