"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { completeReminder, dismissReminder } from "@/app/actions/reminders"
import { Button } from "@/components/ui/button"

export type ContractReminderRow = {
  id: string
  title: string
  description: string
  dueDate: string
  urgencyLevel: string
  estimatedImpactChfYear: number | null
}

export function ContractRemindersList({ items }: { items: ContractReminderRow[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  return (
    <ul className="flex flex-col gap-2">
      {items.map((r) => (
        <li key={r.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{r.title}</p>
            <p className="text-[11px] text-muted-foreground">
              {new Date(r.dueDate).toLocaleDateString("fr-CH")} · {r.urgencyLevel}
              {r.estimatedImpactChfYear != null && r.estimatedImpactChfYear > 0
                ? ` · ≈ CHF ${Math.round(r.estimatedImpactChfYear).toLocaleString("fr-CH")}/an`
                : ""}
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[10px] px-2"
              disabled={pending}
              onClick={() => start(() => dismissReminder(r.id).then(() => router.refresh()))}
            >
              <X className="w-3 h-3" />
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-[10px] px-2"
              disabled={pending}
              onClick={() => start(() => completeReminder(r.id).then(() => router.refresh()))}
            >
              <Check className="w-3 h-3" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
