"use client"

import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  FileText,
  Upload,
  MessageSquare,
  Settings,
  Building2,
  ListTodo,
  Inbox,
  CreditCard,
  ShieldCheck,
  Receipt,
} from "lucide-react"
import type { NavIconId } from "@/lib/services/navigation"

export const NAV_ICON_COMPONENTS: Record<NavIconId, LucideIcon> = {
  dashboard: LayoutDashboard,
  contracts: FileText,
  upload: Upload,
  ai: MessageSquare,
  settings: Settings,
  real_estate: Building2,
  tasks: ListTodo,
  inbox: Inbox,
  billing: CreditCard,
  admin: ShieldCheck,
  bills: Receipt,
}
