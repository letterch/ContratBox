"use client"

import Link from "next/link"
import { ListTodo } from "lucide-react"
import { Button } from "@/components/ui/button"

export type TaskPreviewRow = {
  id: string
  title: string
  status: string
  priority: string
  dueDate: Date | null
}

export function TasksPreview({ tasks }: { tasks: TaskPreviewRow[] }) {
  if (tasks.length === 0) return null

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-primary" />
          Tâches à suivre
        </h3>
        <Button variant="ghost" size="sm" className="text-xs rounded-xl h-8" asChild>
          <Link href="/tasks">Voir tout</Link>
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {tasks.map((t) => (
          <li key={t.id}>
            <Link
              href="/tasks"
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm text-foreground truncate">{t.title}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {t.dueDate
                  ? new Date(t.dueDate).toLocaleDateString("fr-CH")
                  : t.priority === "urgent"
                    ? "Urgent"
                    : "—"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
