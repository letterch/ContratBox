import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  avoidDuplicateReminders,
  buildTriggerDedupeKey,
  mapTriggerKindToReminderType,
  syncDecisionTriggersToReminders,
} from "@/lib/services/reminder-sync"
import type { ContractTriggerEvent } from "@/lib/services/trigger-engine"

vi.mock("@/lib/db", () => ({
  prisma: {
    reminder: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/db"

function makeEvent(over: Partial<ContractTriggerEvent> = {}): ContractTriggerEvent {
  const due = new Date("2026-06-01T00:00:00.000Z")
  return {
    id: "c1-cancellation-2026-06-01",
    kind: "cancellation_window",
    contractId: "c1",
    provider: "Swisscom",
    category: "telecom_mobile",
    daysUntil: 14,
    dueAt: due,
    title: "Swisscom",
    description: "d1",
    recommendedAction: "a1",
    urgency: "high",
    estimatedImpactChfYear: 120,
    ...over,
  }
}

describe("buildTriggerDedupeKey", () => {
  it("est stable par événement", () => {
    expect(buildTriggerDedupeKey(makeEvent())).toBe("trigger_engine:c1-cancellation-2026-06-01")
  })
})

describe("mapTriggerKindToReminderType", () => {
  it("mappe les kinds", () => {
    expect(mapTriggerKindToReminderType("renewal_soon")).toBe("contract_renewal")
    expect(mapTriggerKindToReminderType("cancellation_window")).toBe("cancellation_deadline")
    expect(mapTriggerKindToReminderType("mortgage_maturity")).toBe("mortgage_expiry")
  })
})

describe("avoidDuplicateReminders", () => {
  beforeEach(() => {
    vi.mocked(prisma.reminder.findFirst).mockReset()
  })

  it("retourne true si doublon pending", async () => {
    vi.mocked(prisma.reminder.findFirst).mockResolvedValueOnce({ id: "x" } as never)
    await expect(avoidDuplicateReminders({ householdId: "h1", dedupeKey: "k1" })).resolves.toBe(true)
  })

  it("retourne false si absent", async () => {
    vi.mocked(prisma.reminder.findFirst).mockResolvedValueOnce(null)
    await expect(avoidDuplicateReminders({ householdId: "h1", dedupeKey: "k1" })).resolves.toBe(false)
  })
})

describe("syncDecisionTriggersToReminders", () => {
  beforeEach(() => {
    vi.mocked(prisma.reminder.findMany).mockReset()
    vi.mocked(prisma.reminder.create).mockReset()
  })

  it("crée uniquement les rappels non présents", async () => {
    const ev = makeEvent()
    vi.mocked(prisma.reminder.findMany).mockResolvedValueOnce([])
    vi.mocked(prisma.reminder.create).mockResolvedValueOnce({ id: "r1" } as never)
    const out = await syncDecisionTriggersToReminders("h1", [ev])
    expect(out.created).toBe(1)
    expect(out.skipped).toBe(0)
    expect(prisma.reminder.create).toHaveBeenCalledTimes(1)
  })

  it("skip si dedupeKey déjà pending", async () => {
    const ev = makeEvent()
    vi.mocked(prisma.reminder.findMany).mockResolvedValueOnce([{ dedupeKey: buildTriggerDedupeKey(ev) }] as never)
    const out = await syncDecisionTriggersToReminders("h1", [ev])
    expect(out.created).toBe(0)
    expect(out.skipped).toBe(1)
    expect(prisma.reminder.create).not.toHaveBeenCalled()
  })
})
