"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { NavItemDTO } from "@/lib/services/navigation"
import { NAV_ICON_COMPONENTS } from "@/components/nav-config"

type MobileNavProps = {
  navItems: NavItemDTO[]
}

export function MobileNav({ navItems }: MobileNavProps) {
  const pathname = usePathname()
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/60 flex items-center justify-around py-2 px-2">
      {navItems.map((item) => {
        const Icon = NAV_ICON_COMPONENTS[item.icon]
        const active = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all min-w-0 flex-1",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className={cn("w-5 h-5 flex-shrink-0", active && "fill-primary/10")} />
            <span className="text-[10px] font-medium truncate w-full text-center">{item.shortLabel}</span>
          </Link>
        )
      })}
    </nav>
  )
}
