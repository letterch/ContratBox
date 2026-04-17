"use client"

import Link from "next/link"
import { CalendarClock } from "lucide-react"
import type { TimelineEvent } from "@/lib/services/reminder-timeline"

export function TimelinePreview({ events }: { events: TimelineEvent[] }) {
  if (!events.length) return null

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-primary" />
        Echeances a venir
      </h3>
      <ul className="flex flex-col gap-2">
        {events.map((e) => (
          <li key={e.id}>
            <Link
              href={e.href ?? "/dashboard"}
              className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2 hover:bg-muted/40 transition-colors"
            >
              <span className="text-sm text-foreground truncate">{e.title}</span>
              <span
                className={`text-[10px] shrink-0 ${
                  e.severity === "high" ? "text-[oklch(0.57_0.20_25)]" : "text-muted-foreground"
                }`}
              >
                {new Date(e.date).toLocaleDateString("fr-CH")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

