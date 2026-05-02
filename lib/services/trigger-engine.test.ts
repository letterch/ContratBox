import { describe, expect, it } from "vitest"
import { buildContractTriggerEvents } from "@/lib/services/trigger-engine"

describe("buildContractTriggerEvents", () => {
  it("attache dueAt aux événements", () => {
    const now = new Date("2026-01-01T12:00:00.000Z")
    const cancelDeadline = new Date("2026-01-20T00:00:00.000Z")
    const events = buildContractTriggerEvents(
      [
        {
          id: "c1",
          status: "active",
          category: "telecom_mobile",
          provider: "X",
          cancellationDeadline: cancelDeadline,
          cancellationNoticeDays: 30,
          rawExtraction: {},
        },
      ],
      now
    )
    expect(events.length).toBeGreaterThanOrEqual(1)
    expect(events[0].dueAt).toBeInstanceOf(Date)
  })
})
