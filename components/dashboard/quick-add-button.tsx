"use client"

import Link from "next/link"
import { Plus } from "lucide-react"

export function QuickAddButton() {
  return (
    <Link
      href="/upload"
      className="fixed bottom-24 right-5 lg:bottom-8 lg:right-8 z-40 flex items-center gap-2 pl-4 pr-5 py-3 rounded-2xl bg-primary text-primary-foreground shadow-brand hover:bg-primary/90 hover:shadow-elevated transition-all hover:-translate-y-0.5 group"
    >
      <Plus className="w-4 h-4" />
      <span className="text-sm font-semibold">Ajouter un contrat</span>
    </Link>
  )
}
