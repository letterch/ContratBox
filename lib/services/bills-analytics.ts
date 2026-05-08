import { Decimal } from "@prisma/client/runtime/library"
import type { Bill, HouseholdMember, Contract, BillDocument } from "@prisma/client"
import { BILL_CATEGORIES, type BillCategorySlug } from "@/lib/constants"

type BillForAnalytics = Bill & {
  member: Pick<HouseholdMember, "id" | "firstName" | "lastName"> | null
  contract: Pick<Contract, "id" | "title" | "provider"> | null
  documents: Pick<BillDocument, "id">[]
}

export type BillRow = {
  id: string
  title: string
  provider: string | null
  category: string | null
  categoryLabel: string | null
  amount: number
  currency: string
  issueDate: Date | null
  dueDate: Date | null
  paidAt: Date | null
  status: string
  recurrence: string
  source: string
  member: { id: string; firstName: string; lastName: string | null } | null
  isHouseholdWide: boolean
  contract: { id: string; title: string | null; provider: string | null } | null
  hasDocument: boolean
  daysUntilDue: number | null
}

export type BillsPortfolioSummary = {
  total: number
  pendingCount: number
  paidCount: number
  overdueCount: number
  /** Montant mensuel équivalent (récurrence normalisée). */
  monthlyEquivalentChf: number
  /** Projection annuelle. */
  yearlyEquivalentChf: number
  /** Total de factures dues (status pending/overdue) en CHF. */
  pendingAmountChf: number
  /** Répartition par catégorie. */
  byCategory: { category: string; label: string; amountMonthly: number; count: number }[]
  /** Répartition par membre du ménage (ou ménage entier). */
  byMember: { memberId: string | null; label: string; amountMonthly: number; count: number }[]
}

function decimalToNumber(value: Decimal | number | null | undefined): number {
  if (value == null) return 0
  if (typeof value === "number") return value
  return value.toNumber()
}

function categoryLabel(slug: string | null | undefined): string | null {
  if (!slug) return null
  const key = slug as BillCategorySlug
  return BILL_CATEGORIES[key] ?? slug
}

function recurrenceMonthlyFactor(recurrence: string | null | undefined): number {
  switch (recurrence) {
    case "monthly":
      return 1
    case "quarterly":
      return 1 / 3
    case "annual":
      return 1 / 12
    case "one_off":
    default:
      return 0
  }
}

function memberLabel(b: BillForAnalytics): string {
  if (b.isHouseholdWide) return "Ménage"
  if (b.member) {
    const last = b.member.lastName ? ` ${b.member.lastName}` : ""
    return `${b.member.firstName}${last}`.trim()
  }
  return "Non assigné"
}

function daysUntil(date: Date | null | undefined, now: Date): number | null {
  if (!date) return null
  return Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}

export function buildBillRows(bills: BillForAnalytics[], now: Date = new Date()): BillRow[] {
  return bills.map((b) => ({
    id: b.id,
    title: b.title,
    provider: b.provider,
    category: b.category,
    categoryLabel: categoryLabel(b.category),
    amount: decimalToNumber(b.amount as Decimal),
    currency: b.currency,
    issueDate: b.issueDate,
    dueDate: b.dueDate,
    paidAt: b.paidAt,
    status: b.status,
    recurrence: b.recurrence,
    source: b.source,
    member: b.member
      ? { id: b.member.id, firstName: b.member.firstName, lastName: b.member.lastName }
      : null,
    isHouseholdWide: b.isHouseholdWide,
    contract: b.contract
      ? { id: b.contract.id, title: b.contract.title, provider: b.contract.provider }
      : null,
    hasDocument: b.documents.length > 0,
    daysUntilDue: daysUntil(b.dueDate, now),
  }))
}

export function buildBillsPortfolioSummary(bills: BillForAnalytics[]): BillsPortfolioSummary {
  let monthly = 0
  let pendingAmount = 0
  let pendingCount = 0
  let paidCount = 0
  let overdueCount = 0
  const byCategoryMap = new Map<string, { label: string; amountMonthly: number; count: number }>()
  const byMemberMap = new Map<string, { memberId: string | null; label: string; amountMonthly: number; count: number }>()

  for (const b of bills) {
    if (b.status === "cancelled") continue
    const amt = decimalToNumber(b.amount as Decimal)
    const factor = recurrenceMonthlyFactor(b.recurrence)
    const monthlyContribution = amt * factor
    monthly += monthlyContribution

    if (b.status === "pending") {
      pendingCount++
      pendingAmount += amt
    } else if (b.status === "overdue") {
      overdueCount++
      pendingAmount += amt
    } else if (b.status === "paid") {
      paidCount++
    }

    const catKey = b.category ?? "other"
    const catLabel = categoryLabel(catKey) ?? "Autre"
    const cat = byCategoryMap.get(catKey) ?? { label: catLabel, amountMonthly: 0, count: 0 }
    cat.amountMonthly += monthlyContribution
    cat.count += 1
    byCategoryMap.set(catKey, cat)

    const memberKey = b.isHouseholdWide ? "household" : b.member?.id ?? "unassigned"
    const memberLab = memberLabel(b)
    const mem = byMemberMap.get(memberKey) ?? {
      memberId: b.isHouseholdWide ? null : b.member?.id ?? null,
      label: memberLab,
      amountMonthly: 0,
      count: 0,
    }
    mem.amountMonthly += monthlyContribution
    mem.count += 1
    byMemberMap.set(memberKey, mem)
  }

  const byCategory = Array.from(byCategoryMap.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.amountMonthly - a.amountMonthly)

  const byMember = Array.from(byMemberMap.values()).sort(
    (a, b) => b.amountMonthly - a.amountMonthly
  )

  return {
    total: bills.filter((b) => b.status !== "cancelled").length,
    pendingCount,
    paidCount,
    overdueCount,
    monthlyEquivalentChf: monthly,
    yearlyEquivalentChf: monthly * 12,
    pendingAmountChf: pendingAmount,
    byCategory,
    byMember,
  }
}
