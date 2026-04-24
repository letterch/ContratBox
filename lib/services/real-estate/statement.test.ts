import assert from "node:assert/strict"
import { buildChargeStatementPayload } from "@/lib/services/real-estate/statement"

export function runStatementUnitTests() {
  const payload = buildChargeStatementPayload({
    periodStart: new Date("2026-01-01"),
    periodEnd: new Date("2026-12-31"),
    tenantName: "Locataire Test",
    tenantAllocationPct: 70,
    charges: [
      { label: "PPE", amount: 300, frequency: "monthly" },
      { label: "Assurance", amount: 1200, frequency: "annual" },
    ],
    mortgageMonthlyCost: 1000,
    provisionsPaidByTenant: 5000,
  })

  // PPE: 3600 + assurance 1200 + hypothèque 12000 = 16800 annuels
  // Part locataire 70% => 11760, solde avec provisions 5000 => 6760
  assert.equal(payload.totalCharges, 11760)
  assert.equal(payload.totalProvisions, 5000)
  assert.equal(payload.balance, 6760)
  assert.equal(payload.periodStart, "2026-01-01")
  assert.equal(payload.periodEnd, "2026-12-31")
}
