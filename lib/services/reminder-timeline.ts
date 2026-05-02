import { prisma } from "@/lib/db"
import { getKeyDateFromContractLike } from "@/lib/services/contract-key-date"

export type TimelineEvent = {
  id: string
  source: "reminder" | "task" | "inbox" | "real_estate"
  title: string
  date: Date
  severity: "normal" | "high"
  href?: string
}

type BuildInput = {
  householdId: string
  now?: Date
  daysAhead?: number
  take?: number
}

export async function buildHouseholdTimeline(input: BuildInput): Promise<TimelineEvent[]> {
  const now = input.now ?? new Date()
  const daysAhead = input.daysAhead ?? 90
  const take = input.take ?? 10
  const until = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  const [reminders, tasks, inboxItems, realEstateContracts] = await Promise.all([
    prisma.reminder.findMany({
      where: {
        householdId: input.householdId,
        status: { in: ["pending", "sent"] },
        dueDate: { gte: now, lte: until },
      },
      include: {
        contract: { select: { id: true, provider: true, title: true, category: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 120,
    }),
    prisma.householdTask.findMany({
      where: {
        householdId: input.householdId,
        status: { in: ["todo", "in_progress", "waiting"] },
        dueDate: { gte: now, lte: until },
      },
      select: { id: true, title: true, priority: true, dueDate: true },
      orderBy: { dueDate: "asc" },
      take: 120,
    }),
    prisma.administrativeItem.findMany({
      where: {
        householdId: input.householdId,
        status: "active",
        dueDate: { gte: now, lte: until },
      },
      select: { id: true, originalFilename: true, urgency: true, dueDate: true },
      orderBy: { dueDate: "asc" },
      take: 120,
    }),
    prisma.contract.findMany({
      where: {
        householdId: input.householdId,
        category: { in: ["rent_lease", "mortgage"] },
      },
      select: {
        id: true,
        provider: true,
        title: true,
        category: true,
        renewalDate: true,
        endDate: true,
        maturityDate: true,
        startDate: true,
        rawExtraction: true,
      },
      take: 200,
    }),
  ])

  const events: TimelineEvent[] = []

  for (const r of reminders) {
    const href = r.contractId ? `/contracts/${r.contractId}` : "/dashboard"
    const sev =
      r.urgencyLevel === "high" || r.type === "mortgage_expiry" || r.type === "cancellation_deadline"
        ? "high"
        : "normal"
    events.push({
      id: `reminder:${r.id}`,
      source: "reminder",
      title: r.title || `${r.contract?.provider ?? r.contract?.title ?? "Contrat"} · ${r.type}`,
      date: r.dueDate,
      severity: sev,
      href,
    })
  }

  for (const t of tasks) {
    if (!t.dueDate) continue
    events.push({
      id: `task:${t.id}`,
      source: "task",
      title: t.title,
      date: t.dueDate,
      severity: t.priority === "urgent" || t.priority === "high" ? "high" : "normal",
      href: "/tasks",
    })
  }

  for (const i of inboxItems) {
    if (!i.dueDate) continue
    events.push({
      id: `inbox:${i.id}`,
      source: "inbox",
      title: `Inbox · ${i.originalFilename}`,
      date: i.dueDate,
      severity: i.urgency === "critical" || i.urgency === "high" ? "high" : "normal",
      href: "/inbox",
    })
  }

  for (const c of realEstateContracts) {
    const keyDate = getKeyDateFromContractLike({
      renewalDate: c.renewalDate,
      endDate: c.endDate,
      maturityDate: c.maturityDate,
      startDate: c.startDate,
      rawExtraction: c.rawExtraction ?? undefined,
    })
    if (!keyDate || keyDate < now || keyDate > until) continue
    events.push({
      id: `real_estate:${c.id}:${keyDate.toISOString().slice(0, 10)}`,
      source: "real_estate",
      title: `${c.provider ?? c.title ?? "Contrat"} · échéance immobilière`,
      date: keyDate,
      severity: "normal",
      href: "/real-estate",
    })
  }

  // Déduplication légère : même source + même titre + même date (jour)
  const seen = new Set<string>()
  const deduped = events.filter((e) => {
    const day = e.date.toISOString().slice(0, 10)
    const key = `${e.source}:${e.title}:${day}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  deduped.sort((a, b) => a.date.getTime() - b.date.getTime())
  return deduped.slice(0, take)
}

