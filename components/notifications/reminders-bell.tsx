"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, Check, X, Loader2 } from "lucide-react"
import { completeReminder, dismissReminder } from "@/app/actions/reminders"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ApiReminder = {
  id: string
  title: string
  description: string
  dueDate: string
  urgencyLevel: string
  contractId: string | null
  estimatedImpactChfYear: number | null
}

export function RemindersBell({ initialCount }: { initialCount: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [items, setItems] = useState<ApiReminder[]>([])
  const [loading, setLoading] = useState(false)
  const [pending, start] = useTransition()

  useEffect(() => {
    setCount(initialCount)
  }, [initialCount])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetch("/api/reminders")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setItems(Array.isArray(data?.reminders) ? data.reminders : [])
        if (typeof data?.count === "number") setCount(data.count)
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const refresh = () => {
    router.refresh()
    fetch("/api/reminders")
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data?.reminders) ? data.reminders : [])
        if (typeof data?.count === "number") setCount(data.count)
      })
      .catch(() => {})
  }

  const onDismiss = (id: string) => {
    start(async () => {
      await dismissReminder(id)
      refresh()
    })
  }
  const onDone = (id: string) => {
    start(async () => {
      await completeReminder(id)
      refresh()
    })
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative p-2 rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors"
          aria-label="Rappels"
        >
          <Bell className="w-4 h-4 text-sidebar-foreground/70" />
          {count > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[oklch(0.57_0.20_25)] text-[10px] font-bold text-white flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 max-h-[min(70vh,420px)] overflow-y-auto p-0">
        <div className="px-3 py-2 border-b border-border text-xs font-semibold text-foreground">Rappels prioritaires</div>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="px-3 py-6 text-xs text-muted-foreground text-center">Aucun rappel en attente.</p>
        ) : (
          <ul className="py-1">
            {items.slice(0, 12).map((r) => (
              <li key={r.id} className="px-3 py-2 border-b border-border/60 last:border-0">
                <p className="text-xs font-medium text-foreground line-clamp-2">{r.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(r.dueDate).toLocaleDateString("fr-CH")} · {r.urgencyLevel}
                </p>
                <div className="flex gap-1.5 mt-2">
                  {r.contractId && (
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" asChild>
                      <Link href={`/contracts/${r.contractId}`}>Contrat</Link>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] px-2"
                    disabled={pending}
                    onClick={() => onDismiss(r.id)}
                  >
                    <X className="w-3 h-3 mr-0.5" />
                    Ignorer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] px-2"
                    disabled={pending}
                    onClick={() => onDone(r.id)}
                  >
                    <Check className="w-3 h-3 mr-0.5" />
                    Fait
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="px-2 py-2 border-t border-border">
          <Button variant="outline" size="sm" className="w-full h-8 text-xs rounded-lg" asChild>
            <Link href="/dashboard" onClick={() => setOpen(false)}>
              Tableau de bord
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
