import { describe, expect, it } from "vitest"
import { computePriorityScore } from "@/lib/services/recommendation-engine"

describe("computePriorityScore", () => {
  it("monte avec urgence et impact", () => {
    const low = computePriorityScore({ urgency: "low", impactChfYear: 0, daysUntil: 60 })
    const high = computePriorityScore({ urgency: "high", impactChfYear: 5000, daysUntil: 5 })
    expect(high).toBeGreaterThan(low)
    expect(high).toBeLessThanOrEqual(100)
  })
})
