import { addDays, startOfDay, subDays } from "date-fns"
import { prisma } from "@/lib/db"
import type { ContractTriggerEvent } from "@/lib/services/trigger-engine"

export type ReminderType =
  | "contract_renewal"
  | "cancellation_deadline"
  | "mortgage_expiry"
  | "savings_opportunity"
  | "bill_due"

export function mapTriggerKindToReminderType(kind: ContractTriggerEvent["kind"]): ReminderType {
  if (kind === "renewal_soon") return "contract_renewal"
  if (kind === "cancellation_window") return "cancellation_deadline"
  return "mortgage_expiry"
}

/** Clé stable par événement trigger (id inclut contrat + date + type) */
export function buildTriggerDedupeKey(ev: ContractTriggerEvent): string {
  return `trigger_engine:${ev.id}`
}

/**
 * Retourne true si un rappel actif existe déjà pour cette clé (évite doublons sync).
 */
export async function avoidDuplicateReminders(input: {
  householdId: string
  dedupeKey: string
}): Promise<boolean> {
  const row = await prisma.reminder.findFirst({
    where: {
      householdId: input.householdId,
      dedupeKey: input.dedupeKey,
      status: { in: ["pending", "sent"] },
    },
    select: { id: true },
  })
  return Boolean(row)
}

export async function syncDecisionTriggersToReminders(
  householdId: string,
  events: ContractTriggerEvent[]
): Promise<{ created: number; skipped: number }> {
  let created = 0
  let skipped = 0
  const dedupeKeys = events.map((e) => buildTriggerDedupeKey(e))
  if (dedupeKeys.length === 0) return { created: 0, skipped: 0 }

  const existing = await prisma.reminder.findMany({
    where: {
      householdId,
      dedupeKey: { in: dedupeKeys },
      status: { in: ["pending", "sent"] },
    },
    select: { dedupeKey: true },
  })
  const blocked = new Set(existing.map((e) => e.dedupeKey).filter(Boolean) as string[])

  for (const ev of events) {
    const dk = buildTriggerDedupeKey(ev)
    if (blocked.has(dk)) {
      skipped++
      continue
    }

    const type = mapTriggerKindToReminderType(ev.kind)
    const description = [ev.description, ev.recommendedAction].filter(Boolean).join("\n\n")

    await prisma.reminder.create({
      data: {
        householdId,
        contractId: ev.contractId,
        type,
        title: ev.title.slice(0, 200),
        description: description.slice(0, 8000),
        dueDate: ev.dueAt,
        urgencyLevel: ev.urgency,
        estimatedImpactChfYear: ev.estimatedImpactChfYear > 0 ? ev.estimatedImpactChfYear : null,
        status: "pending",
        source: "trigger_engine",
        dedupeKey: dk,
      },
    })
    blocked.add(dk)
    created++
  }
  return { created, skipped }
}

export type PendingReminderLite = {
  id: string
  title: string
  description: string
  dueDate: Date
  urgencyLevel: string
  contractId: string | null
  estimatedImpactChfYear: number | null
}

export async function getPendingRemindersForHousehold(
  householdId: string,
  take = 20
): Promise<PendingReminderLite[]> {
  const now = new Date()
  const from = subDays(startOfDay(now), 30)
  const to = addDays(startOfDay(now), 365)
  const rows = await prisma.reminder.findMany({
    where: {
      householdId,
      status: "pending",
      dueDate: { gte: from, lte: to },
    },
    orderBy: { dueDate: "asc" },
    take,
    select: {
      id: true,
      title: true,
      description: true,
      dueDate: true,
      urgencyLevel: true,
      contractId: true,
      estimatedImpactChfYear: true,
    },
  })
  const uRank = (x: string) => (x === "high" ? 0 : x === "medium" ? 1 : 2)
  return rows
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      dueDate: r.dueDate,
      urgencyLevel: r.urgencyLevel,
      contractId: r.contractId,
      estimatedImpactChfYear: r.estimatedImpactChfYear != null ? Number(r.estimatedImpactChfYear) : null,
    }))
    .sort((a, b) => uRank(a.urgencyLevel) - uRank(b.urgencyLevel) || a.dueDate.getTime() - b.dueDate.getTime())
}

export async function countPendingReminders(householdId: string): Promise<number> {
  return prisma.reminder.count({
    where: {
      householdId,
      status: "pending",
    },
  })
}

/**
 * Synchronise les rappels d'échéances pour les factures non payées du foyer.
 * Création idempotente via dedupeKey `bill_due:<billId>:<dueDate>`.
 * Doit être appelé après création / mise à jour d'une facture.
 */
export async function syncBillRemindersForHousehold(
  householdId: string,
  now: Date = new Date()
): Promise<{ created: number; skipped: number }> {
  const horizon = addDays(startOfDay(now), 90)
  const bills = await prisma.bill.findMany({
    where: {
      householdId,
      status: { in: ["pending", "overdue"] },
      dueDate: { not: null, lte: horizon },
    },
    select: {
      id: true,
      title: true,
      provider: true,
      dueDate: true,
      amount: true,
      currency: true,
    },
  })
  if (bills.length === 0) return { created: 0, skipped: 0 }

  const dedupeKeys = bills
    .map((b) => (b.dueDate ? `bill_due:${b.id}:${b.dueDate.toISOString().slice(0, 10)}` : null))
    .filter(Boolean) as string[]
  const existing = await prisma.reminder.findMany({
    where: {
      householdId,
      dedupeKey: { in: dedupeKeys },
      status: { in: ["pending", "sent"] },
    },
    select: { dedupeKey: true },
  })
  const blocked = new Set(existing.map((e) => e.dedupeKey).filter(Boolean) as string[])

  let created = 0
  let skipped = 0
  for (const bill of bills) {
    if (!bill.dueDate) continue
    const dk = `bill_due:${bill.id}:${bill.dueDate.toISOString().slice(0, 10)}`
    if (blocked.has(dk)) {
      skipped++
      continue
    }
    const days = Math.ceil((bill.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    const urgency = days < 0 ? "high" : days <= 3 ? "high" : days <= 14 ? "medium" : "low"
    const amountStr = `${Number(bill.amount).toFixed(2)} ${bill.currency}`
    await prisma.reminder.create({
      data: {
        householdId,
        billId: bill.id,
        type: "bill_due",
        title: bill.title.slice(0, 200),
        description: [
          bill.provider ? `Fournisseur : ${bill.provider}.` : null,
          `Montant à régler : ${amountStr}.`,
          days < 0
            ? `Échéance dépassée de ${Math.abs(days)} j.`
            : `Échéance dans ${days} j.`,
        ]
          .filter(Boolean)
          .join(" "),
        dueDate: startOfDay(bill.dueDate),
        urgencyLevel: urgency,
        status: "pending",
        source: "bill_engine",
        dedupeKey: dk,
      },
    })
    blocked.add(dk)
    created++
  }
  return { created, skipped }
}
