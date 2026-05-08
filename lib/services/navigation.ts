import type { AccessContext } from "@/lib/services/access-context"
import { accessCanUseModule } from "@/lib/services/access-context"

/** Identifiants d’icônes sérialisables (côté client → lucide). */
export type NavIconId =
  | "dashboard"
  | "contracts"
  | "upload"
  | "ai"
  | "settings"
  | "real_estate"
  | "tasks"
  | "inbox"
  | "billing"
  | "admin"
  | "bills"

export type NavPlacement = "both" | "desktop" | "mobile"

export type MainNavItem = {
  href: string
  label: string
  /** Libellé court pour la barre mobile */
  shortLabel: string
  icon: NavIconId
  placement: NavPlacement
  visible: boolean
}

type NavTemplate = Omit<MainNavItem, "visible">

const NAV_TEMPLATES: NavTemplate[] = [
  { href: "/dashboard", label: "Tableau de bord", shortLabel: "Accueil", icon: "dashboard", placement: "both" },
  { href: "/contracts", label: "Contrats", shortLabel: "Contrats", icon: "contracts", placement: "both" },
  { href: "/bills", label: "Factures", shortLabel: "Factures", icon: "bills", placement: "both" },
  { href: "/upload", label: "Ajouter un contrat", shortLabel: "Ajouter", icon: "upload", placement: "desktop" },
  { href: "/inbox", label: "Inbox admin", shortLabel: "Inbox", icon: "inbox", placement: "desktop" },
  { href: "/tasks", label: "Tâches", shortLabel: "Tâches", icon: "tasks", placement: "desktop" },
  { href: "/ai", label: "Assistant IA", shortLabel: "IA", icon: "ai", placement: "both" },
  { href: "/real-estate", label: "Gestion immobilière", shortLabel: "Immo", icon: "real_estate", placement: "both" },
  { href: "/billing", label: "Facturation", shortLabel: "Offre", icon: "billing", placement: "desktop" },
  { href: "/settings", label: "Paramètres", shortLabel: "Réglages", icon: "settings", placement: "both" },
  { href: "/admin", label: "Administration", shortLabel: "Admin", icon: "admin", placement: "desktop" },
]

function itemVisible(ctx: AccessContext, href: string): boolean {
  switch (href) {
    case "/dashboard":
    case "/contracts":
    case "/upload":
    case "/settings":
      return true
    case "/bills":
      return accessCanUseModule(ctx, "module_bills")
    case "/ai":
      return accessCanUseModule(ctx, "module_ai_chat")
    case "/real-estate":
      return accessCanUseModule(ctx, "module_real_estate")
    case "/inbox":
      return accessCanUseModule(ctx, "module_inbox")
    case "/tasks":
      return accessCanUseModule(ctx, "module_tasks")
    case "/billing":
      return true
    case "/admin":
      return ctx.isPlatformAdmin
    default:
      return false
  }
}

/** Menu principal filtré selon AccessContext (même logique partout). */
export function buildMainNavItems(ctx: AccessContext | null): MainNavItem[] {
  if (!ctx) return []
  return NAV_TEMPLATES.map((t) => ({
    ...t,
    visible: itemVisible(ctx, t.href),
  }))
}

export function filterNavForDesktop(items: MainNavItem[]): MainNavItem[] {
  return items.filter((i) => i.visible && (i.placement === "both" || i.placement === "desktop"))
}

export function filterNavForMobile(items: MainNavItem[]): MainNavItem[] {
  return items.filter((i) => i.visible && (i.placement === "both" || i.placement === "mobile"))
}

/** Props sérialisables pour les composants client (sidebar / mobile). */
export type NavItemDTO = Pick<MainNavItem, "href" | "label" | "shortLabel" | "icon">

export function toDesktopNavDtos(ctx: AccessContext | null): NavItemDTO[] {
  return filterNavForDesktop(buildMainNavItems(ctx)).map(({ href, label, shortLabel, icon }) => ({
    href,
    label,
    shortLabel,
    icon,
  }))
}

export function toMobileNavDtos(ctx: AccessContext | null): NavItemDTO[] {
  return filterNavForMobile(buildMainNavItems(ctx)).map(({ href, label, shortLabel, icon }) => ({
    href,
    label,
    shortLabel,
    icon,
  }))
}
