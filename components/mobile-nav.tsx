"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, FileText, Upload, MessageSquare, Settings } from "lucide-react"

const items = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/contracts", label: "Contrats", icon: FileText },
  { href: "/upload", label: "Ajouter", icon: Upload },
  { href: "/ai", label: "IA", icon: MessageSquare },
  { href: "/settings", label: "Réglages", icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/60 flex items-center justify-around py-2 px-4">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className={cn("w-5 h-5", active && "fill-primary/10")} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
