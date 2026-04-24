import assert from "node:assert/strict"
import { computeMortgageCharges, toMonthlyAmount } from "@/lib/services/real-estate/finance"

export function runFinanceUnitTests() {
  assert.equal(toMonthlyAmount(1200, "annual"), 100)
  assert.equal(toMonthlyAmount(300, "quarterly"), 100)
  assert.equal(toMonthlyAmount(100, "monthly"), 100)

  const result = computeMortgageCharges({
    tranches: [
      { principal: 500_000, ratePct: 1.8, rateType: "fixed" },
      { principal: 200_000, ratePct: 2.2, rateType: "saron" },
    ],
    amortizationRatePct: 1.25,
    additionalCharges: [{ amount: 2400, frequency: "annual" }],
  })

  // Intérêts mensuels attendus selon règle métier: principal*taux/100/4/3
  const expectedInterest = (500_000 * 1.8) / 100 / 4 / 3 + (200_000 * 2.2) / 100 / 4 / 3
  const expectedAmortization = (500_000 * 1.25) / 100 / 4 / 3 + (200_000 * 1.25) / 100 / 4 / 3
  assert.ok(Math.abs(result.monthlyInterest - expectedInterest) < 1e-6)
  assert.ok(Math.abs(result.monthlyAmortization - expectedAmortization) < 1e-6)
  assert.equal(result.monthlyAdditionalCharges, 200)
  assert.equal(result.quarterlyTotal, result.monthlyTotal * 3)
  assert.equal(result.annualTotal, result.monthlyTotal * 12)
}
