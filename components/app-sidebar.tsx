"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  Upload,
  MessageSquare,
  Settings,
  ChevronDown,
  Bell,
  LogOut,
  Home,
  ShieldCheck,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Session } from "next-auth"

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/contracts", label: "Contrats", icon: FileText },
  { href: "/upload", label: "Ajouter un contrat", icon: Upload },
  { href: "/ai", label: "Assistant IA", icon: MessageSquare },
  { href: "/settings", label: "Paramètres", icon: Settings },
  { href: "/admin", label: "Administration", icon: ShieldCheck },
]

type AppSidebarProps = {
  session: Session | null
  householdName?: string | null
  contractCount?: number | null
  memberCount?: number | null
}

export function AppSidebar({ session, householdName = "Mon ménage", contractCount, memberCount = 0 }: AppSidebarProps) {
  const pathname = usePathname()
  const user = session?.user

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-xl bg-sidebar-primary flex items-center justify-center">
          <span className="text-sidebar-primary-foreground font-bold text-sm font-mono">CB</span>
        </div>
        <span className="text-sidebar-foreground font-semibold text-base tracking-tight">ContratBox</span>
      </div>

      {/* Household selector */}
      <div className="px-4 py-3 border-b border-sidebar-border">
        <button className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors group">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
              <Home className="w-3.5 h-3.5 text-sidebar-primary" />
            </div>
            <div className="text-left">
              <p className="text-sidebar-foreground text-xs font-medium leading-tight">{householdName}</p>
              <p className="text-sidebar-foreground/40 text-[10px]">{memberCount} membre{memberCount !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60 transition-colors" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </div>
              {item.href === "/contracts" && contractCount != null && (
                <Badge
                  className={cn(
                    "text-[10px] h-4 px-1.5",
                    active
                      ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground border-0"
                      : "bg-sidebar-accent text-sidebar-foreground/50 border-0"
                  )}
                >
                  {contractCount}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Alerts banner */}
      <div className="px-4 pb-3">
        <div className="rounded-xl bg-warning/10 border border-warning/20 px-3 py-2.5 flex items-start gap-2.5">
          <Bell className="w-3.5 h-3.5 text-warning mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sidebar-foreground text-xs font-medium">Échéances à venir</p>
            <p className="text-sidebar-foreground/50 text-[10px] mt-0.5">Consultez le calendrier du dashboard</p>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-t border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/30 flex items-center justify-center">
            <span className="text-sidebar-primary text-xs font-semibold">
              {user?.name?.slice(0, 2).toUpperCase() ?? user?.email?.slice(0, 2).toUpperCase() ?? "?"}
            </span>
          </div>
          <div>
            <p className="text-sidebar-foreground text-xs font-medium truncate max-w-[120px]">{user?.name ?? user?.email ?? "Compte"}</p>
            <p className="text-sidebar-foreground/40 text-[10px]">Gratuit</p>
          </div>
        </div>
        <button
          type="button"
          className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="w-3.5 h-3.5 text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors" />
        </button>
      </div>
    </aside>
  )
}
