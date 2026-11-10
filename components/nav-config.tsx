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
  Users,
  Wallet,
  Zap,
} from "lucide-react"
import type { NavIconId } from "@/lib/services/navigation"

export const NAV_ICON_COMPONENTS: Record<NavIconId, LucideIcon> = {
  dashboard: LayoutDashboard,
  family: Users,
  contracts: FileText,
  bills: Receipt,
  budget: Wallet,
  ai: MessageSquare,
  actions: Zap,
  settings: Settings,
  real_estate: Building2,
  tasks: ListTodo,
  inbox: Inbox,
  billing: CreditCard,
  admin: ShieldCheck,
  upload: Upload,
}
