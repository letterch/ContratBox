import { prisma } from "@/lib/db"
import { buildHouseholdCashflow } from "@/lib/services/budget-engine"

export async function listIncomes(householdId: string) {
  return prisma.income.findMany({
    where: { householdId, isActive: true },
    orderBy: { createdAt: "desc" },
    include: { member: { select: { id: true, firstName: true, lastName: true } } },
  })
}

export async function createIncome(input: {
  householdId: string
  createdById: string
  name: string
  amount: number
  frequency: string
  category: string
  scope?: string
  memberId?: string | null
  dayOfMonth?: number | null
  notes?: string | null
}) {
  return prisma.income.create({
    data: {
      householdId: input.householdId,
      createdById: input.createdById,
      name: input.name.trim(),
      amount: input.amount,
      frequency: input.frequency,
      category: input.category,
      scope: input.scope ?? "family",
      memberId: input.memberId ?? null,
      dayOfMonth: input.dayOfMonth ?? null,
      notes: input.notes?.trim() || null,
    },
  })
}

export async function deleteIncome(id: string, householdId: string) {
  return prisma.income.updateMany({
    where: { id, householdId },
    data: { isActive: false },
  })
}

export async function listBudgetEnvelopes(householdId: string, year: number, month: number) {
  return prisma.budgetEnvelope.findMany({
    where: { householdId, year, month },
    orderBy: { name: "asc" },
    include: {
      member: { select: { id: true, firstName: true } },
      dependent: { select: { id: true, name: true, type: true } },
    },
  })
}

export async function upsertBudgetEnvelope(input: {
  householdId: string
  name: string
  amount: number
  category: string
  month: number
  year: number
  scope?: string
  memberId?: string | null
  dependentId?: string | null
}) {
  const scope = input.scope ?? "family"
  const memberId = input.memberId ?? null
  const dependentId = input.dependentId ?? null
  const name = input.name.trim()
  const existing = await prisma.budgetEnvelope.findFirst({
    where: {
      householdId: input.householdId,
      name,
      month: input.month,
      year: input.year,
      scope,
      memberId,
      dependentId,
    },
  })
  if (existing) {
    return prisma.budgetEnvelope.update({
      where: { id: existing.id },
      data: { amount: input.amount, category: input.category },
    })
  }
  return prisma.budgetEnvelope.create({
    data: {
      householdId: input.householdId,
      name,
      amount: input.amount,
      category: input.category,
      month: input.month,
      year: input.year,
      scope,
      memberId,
      dependentId,
    },
  })
}

export async function getBudgetOverview(householdId: string) {
  const [incomes, contracts, bills] = await Promise.all([
    prisma.income.findMany({ where: { householdId, isActive: true } }),
    prisma.contract.findMany({
      where: { householdId, status: "active" },
      select: {
        premiumAmount: true,
        premiumFrequency: true,
        status: true,
        memberId: true,
      },
    }),
    prisma.bill.findMany({
      where: { householdId, status: { not: "cancelled" } },
      select: {
        amount: true,
        recurrence: true,
        status: true,
        memberId: true,
      },
    }),
  ])

  const cashflow = buildHouseholdCashflow({
    incomes,
    contracts,
    bills: bills.map((b) => ({
      amount: b.amount,
      recurrence: b.recurrence,
      status: b.status,
      memberId: b.memberId,
    })),
  })

  return { cashflow, incomes, contractCount: contracts.length, billCount: bills.length }
}
