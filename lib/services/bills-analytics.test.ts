import { describe, expect, it } from "vitest"
import { Decimal } from "@prisma/client/runtime/library"
import { buildBillsPortfolioSummary, buildBillRows } from "@/lib/services/bills-analytics"
import type { Bill, BillDocument, Contract, HouseholdMember } from "@prisma/client"

type AnyBill = Bill & {
  member: Pick<HouseholdMember, "id" | "firstName" | "lastName"> | null
  contract: Pick<Contract, "id" | "title" | "provider"> | null
  documents: Pick<BillDocument, "id">[]
}

function makeBill(over: Partial<AnyBill> = {}): AnyBill {
  return {
    id: "b1",
    householdId: "h1",
    createdById: "u1",
    contractId: null,
    memberId: null,
    isHouseholdWide: true,
    title: "Test bill",
    provider: null,
    category: "other",
    invoiceNumber: null,
    reference: null,
    amount: new Decimal(100),
    currency: "CHF",
    issueDate: null,
    dueDate: null,
    paidAt: null,
    status: "pending",
    recurrence: "monthly",
    source: "manual",
    notes: null,
    extractedText: null,
    extractionConfidence: null,
    rawExtraction: null,
    textExtractionMeta: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    member: null,
    contract: null,
    documents: [],
    ...over,
  } as AnyBill
}

describe("buildBillsPortfolioSummary", () => {
  it("agrège les montants mensuels et compte les statuts", () => {
    const bills = [
      makeBill({ id: "b1", amount: new Decimal(100), recurrence: "monthly", status: "pending" }),
      makeBill({ id: "b2", amount: new Decimal(360), recurrence: "annual", status: "paid" }),
      makeBill({ id: "b3", amount: new Decimal(45), recurrence: "monthly", status: "overdue" }),
      makeBill({ id: "b4", amount: new Decimal(50), recurrence: "one_off", status: "cancelled" }),
    ]
    const s = buildBillsPortfolioSummary(bills)
    expect(s.total).toBe(3)
    expect(s.pendingCount).toBe(1)
    expect(s.paidCount).toBe(1)
    expect(s.overdueCount).toBe(1)
    expect(s.monthlyEquivalentChf).toBeCloseTo(100 + 360 / 12 + 45, 2)
    expect(s.yearlyEquivalentChf).toBeCloseTo(s.monthlyEquivalentChf * 12, 2)
    expect(s.pendingAmountChf).toBe(145)
  })

  it("regroupe par catégorie et par membre", () => {
    const bills = [
      makeBill({
        id: "b1",
        amount: new Decimal(50),
        category: "telecom_mobile",
        member: { id: "m1", firstName: "Alice", lastName: null },
        isHouseholdWide: false,
      }),
      makeBill({
        id: "b2",
        amount: new Decimal(80),
        category: "telecom_mobile",
        member: { id: "m2", firstName: "Bob", lastName: null },
        isHouseholdWide: false,
      }),
      makeBill({
        id: "b3",
        amount: new Decimal(200),
        category: "rent",
        isHouseholdWide: true,
      }),
    ]
    const s = buildBillsPortfolioSummary(bills)
    const telecom = s.byCategory.find((c) => c.category === "telecom_mobile")
    const rent = s.byCategory.find((c) => c.category === "rent")
    expect(telecom?.amountMonthly).toBe(130)
    expect(rent?.amountMonthly).toBe(200)
    expect(s.byMember.find((m) => m.label === "Alice")?.amountMonthly).toBe(50)
    expect(s.byMember.find((m) => m.label === "Ménage")?.amountMonthly).toBe(200)
  })
})

describe("buildBillRows", () => {
  it("calcule daysUntilDue", () => {
    const due = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    const rows = buildBillRows([makeBill({ dueDate: due })])
    expect(rows[0].daysUntilDue).toBeGreaterThanOrEqual(4)
    expect(rows[0].daysUntilDue).toBeLessThanOrEqual(5)
  })
})
