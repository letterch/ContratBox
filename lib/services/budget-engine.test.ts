import assert from "node:assert/strict"
import { buildHouseholdCashflow } from "@/lib/services/budget-engine"

const cf = buildHouseholdCashflow({
  incomes: [{ amount: 6000, frequency: "monthly", isActive: true }],
  contracts: [
    { premiumAmount: 120, premiumFrequency: "monthly", status: "active" },
    { premiumAmount: 600, premiumFrequency: "annual", status: "active" },
  ],
  bills: [{ amount: 90, recurrence: "monthly", status: "pending" }],
})

assert.equal(cf.incomeMonthly, 6000)
assert.equal(cf.premiumsMonthly, 170) // 120 + 50
assert.equal(cf.billsMonthly, 90)
assert.equal(cf.expensesMonthly, 260)
assert.equal(cf.netMonthly, 5740)

console.log("budget-engine.test.ts OK")
