import assert from "node:assert/strict"
import { computeMortgageCharges, toMonthlyAmount } from "@/lib/services/real-estate/finance"

export function runFinanceUnitTests() {
  assert.equal(toMonthlyAmount(1200, "annual"), 100)
  assert.equal(toMonthlyAmount(300, "quarterly"), 100)
  assert.equal(toMonthlyAmount(100, "monthly"), 100)

  const result = computeMortgageCharges({
    mortgageTranches: [
      { principal: 500_000, ratePct: 1.8, rateType: "fixed" },
      { principal: 200_000, ratePct: 2.2, rateType: "saron" },
    ],
    amortizationEntries: [
      { principal: 500_000, ratePct: 1.25, mode: "direct" },
      { principal: 200_000, ratePct: 1.25, mode: "direct" },
    ],
    additionalCharges: [{ amount: 2400, frequency: "annual" }],
  })

  const expectedInterest = (500_000 * 1.8) / 100 / 12 + (200_000 * 2.2) / 100 / 12
  const expectedAmortization = (500_000 * 1.25) / 100 / 12 + (200_000 * 1.25) / 100 / 12
  assert.ok(Math.abs(result.monthlyInterest - expectedInterest) < 1e-6)
  assert.ok(Math.abs(result.monthlyAmortization - expectedAmortization) < 1e-6)
  assert.ok(Math.abs(result.monthlyAmortizationDirect - expectedAmortization) < 1e-6)
  assert.equal(result.monthlyAmortizationIndirect, 0)
  assert.equal(result.monthlyAdditionalCharges, 200)
  assert.equal(result.quarterlyTotal, result.monthlyTotal * 3)
  assert.equal(result.annualTotal, result.monthlyTotal * 12)

  const exampleUser = computeMortgageCharges({
    mortgageTranches: [{ principal: 570_000, ratePct: 0.94, rateType: "fixed" }],
    amortizationEntries: [{ principal: 570_000, ratePct: 1.25, mode: "direct" }],
  })
  assert.ok(Math.abs(exampleUser.monthlyInterest - 446.5) < 0.02)
  assert.ok(Math.abs(exampleUser.monthlyAmortization - 593.75) < 0.02)
  assert.ok(Math.abs(exampleUser.monthlyMortgageTotal - 1040.25) < 0.03)
}
