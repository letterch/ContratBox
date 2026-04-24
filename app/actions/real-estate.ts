"use server"

import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAccessContextForUser, accessCanUseModule, accessTaskQuotaAllows } from "@/lib/services/access-context"
import { createHouseholdTask, countNonArchivedTasks } from "@/lib/services/household-task"
import { buildChargeStatementPayload } from "@/lib/services/real-estate/statement"
import { computeMortgageCharges, computeMortgageMaturityAlerts } from "@/lib/services/real-estate/finance"
import { computeYieldSummary } from "@/lib/services/real-estate/yield"

function toRateType(value: unknown): "fixed" | "saron" {
  return String(value ?? "").toLowerCase() === "saron" ? "saron" : "fixed"
}

function toAmortizationMode(value: unknown): "direct" | "indirect" {
  return String(value ?? "").toLowerCase() === "indirect" ? "indirect" : "direct"
}

function buildFinanceInputs(loans: Array<{
  loanKind: string
  amortizationMode: string
  principalTotal: { toString(): string } | number
  amortizationRatePct: { toString(): string } | number
  tranches: Array<{ principal: { toString(): string } | number; ratePct: { toString(): string } | number; rateType: string }>
}>) {
  const mortgageLoans = loans.filter((l) => l.loanKind !== "amortization")
  const amortizationLoans = loans.filter((l) => l.loanKind === "amortization")

  const mortgageTranches = mortgageLoans.flatMap((l) =>
    l.tranches.map((t) => ({
      principal: Number(t.principal),
      ratePct: Number(t.ratePct),
      rateType: toRateType(t.rateType),
    }))
  )

  const amortizationEntriesFromLoans = amortizationLoans.flatMap((l) => {
    if (l.tranches.length > 0) {
      return l.tranches.map((t) => ({
        principal: Number(t.principal),
        ratePct: Number(t.ratePct),
        mode: toAmortizationMode(l.amortizationMode),
      }))
    }
    return [
      {
        principal: Number(l.principalTotal),
        ratePct: Number(l.amortizationRatePct),
        mode: toAmortizationMode(l.amortizationMode),
      },
    ]
  })

  // Fallback MVP: si aucun prêt d'amortissement dédié, appliquer le taux générique des prêts hypothécaires.
  const amortizationEntriesFallback =
    amortizationEntriesFromLoans.length === 0
      ? mortgageLoans.map((l) => ({
          principal: Number(l.principalTotal),
          ratePct: Number(l.amortizationRatePct),
          mode: "direct" as const,
        }))
      : []

  return {
    mortgageTranches,
    amortizationEntries: [...amortizationEntriesFromLoans, ...amortizationEntriesFallback],
  }
}

export async function getRealEstateOverview() {
  const session = await auth()
  if (!session?.user?.id) return null
  const household = await prisma.household.findFirst({ where: { ownerId: session.user.id } })
  if (!household) return null
  const properties = await prisma.realEstateProperty.findMany({
    where: { householdId: household.id, isActive: true },
    include: {
      mortgageLoans: { include: { tranches: true } },
      charges: true,
      leases: { include: { rentPayments: { orderBy: { month: "desc" }, take: 3 } } },
      chargeStatements: { orderBy: { createdAt: "desc" }, take: 1 },
      tasks: { where: { status: { in: ["todo", "in_progress", "waiting"] } }, take: 3, orderBy: { updatedAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
  })
  let monthlyIncome = 0
  let monthlyCharges = 0
  const rows = properties.map((p) => {
    const financeInputs = buildFinanceInputs(p.mortgageLoans)
    const finance = computeMortgageCharges({
      mortgageTranches: financeInputs.mortgageTranches,
      amortizationEntries: financeInputs.amortizationEntries,
      additionalCharges: p.charges.map((c) => ({
        amount: Number(c.amount),
        frequency: c.frequency as "monthly" | "quarterly" | "annual",
      })),
    })
    const rentPotential = p.leases
      .filter((l) => l.isRented)
      .reduce((sum, l) => sum + Number(l.rentMonthly) + Number(l.chargesMonthly), 0)
    monthlyIncome += rentPotential
    monthlyCharges += finance.monthlyTotal
    return {
      id: p.id,
      name: p.name,
      address: p.address,
      monthlyIncome: rentPotential,
      monthlyCharges: finance.monthlyTotal,
      netMonthly: rentPotential - finance.monthlyTotal,
      lastStatementAt: p.chargeStatements[0]?.createdAt?.toISOString().slice(0, 10) ?? null,
      openTasks: p.tasks.length,
    }
  })
  return {
    propertyCount: properties.length,
    monthlyIncome,
    monthlyCharges,
    annualIncome: monthlyIncome * 12,
    annualCharges: monthlyCharges * 12,
    netMonthly: monthlyIncome - monthlyCharges,
    properties: rows,
  }
}

/** Crée une tâche de suivi liée à un bail / prêt immobilier (pilotée par quotas + modules). */
export async function createRealEstateFollowUpTaskAction(formData: FormData) {
  const propertyId = String(formData.get("propertyId") ?? "")
  if (!propertyId) throw new Error("Bien manquant")
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")
  const ctx = await getAccessContextForUser(session.user.id, session)
  if (!ctx?.household) throw new Error("Ménage introuvable")
  if (!accessCanUseModule(ctx, "module_real_estate")) throw new Error("Module immobilier non disponible")
  if (!accessCanUseModule(ctx, "module_tasks")) throw new Error("Activez une offre avec tâches pour créer un suivi")

  const property = await prisma.realEstateProperty.findFirst({
    where: {
      id: propertyId,
      householdId: ctx.household.id,
    },
  })
  if (!property) throw new Error("Bien immobilier introuvable")

  const taskCount = await countNonArchivedTasks(ctx.household.id)
  if (!accessTaskQuotaAllows(ctx, taskCount)) throw new Error("Quota de tâches atteint")

  await createHouseholdTask({
    householdId: ctx.household.id,
    createdById: ctx.userId,
    title: `Suivi immobilier — ${property.name}`,
    description: "Créé depuis la vue immobilière — échéances et courriers à préparer selon votre situation.",
    realEstatePropertyId: property.id,
    priority: "high",
  })
  revalidatePath("/real-estate")
  revalidatePath("/tasks")
  revalidatePath("/dashboard")
}

async function requireOwnerHousehold() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")
  const household = await prisma.household.findFirst({ where: { ownerId: session.user.id } })
  if (!household) throw new Error("Ménage introuvable")
  return { userId: session.user.id, householdId: household.id }
}

export async function createRealEstatePropertyAction(formData: FormData) {
  const { householdId } = await requireOwnerHousehold()
  const name = String(formData.get("name") ?? "").trim()
  if (!name) throw new Error("Nom du bien requis")
  const address = String(formData.get("address") ?? "").trim() || null
  const propertyType = String(formData.get("propertyType") ?? "apartment").trim() || "apartment"
  await prisma.realEstateProperty.create({
    data: { householdId, name, address, propertyType, isActive: true },
  })
  revalidatePath("/real-estate")
}

export async function updateRealEstatePropertyAction(formData: FormData) {
  const { householdId } = await requireOwnerHousehold()
  const propertyId = String(formData.get("propertyId") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const address = String(formData.get("address") ?? "").trim() || null
  const propertyType = String(formData.get("propertyType") ?? "apartment").trim() || "apartment"
  await prisma.realEstateProperty.updateMany({
    where: { id: propertyId, householdId },
    data: { name, address, propertyType },
  })
  revalidatePath("/real-estate")
  revalidatePath(`/real-estate/${propertyId}/financing`)
}

export async function archiveRealEstatePropertyAction(formData: FormData) {
  const { householdId } = await requireOwnerHousehold()
  const propertyId = String(formData.get("propertyId") ?? "")
  await prisma.realEstateProperty.updateMany({
    where: { id: propertyId, householdId },
    data: { isActive: false },
  })
  revalidatePath("/real-estate")
}

export async function createMortgageLoanAction(formData: FormData) {
  const { householdId } = await requireOwnerHousehold()
  const propertyId = String(formData.get("propertyId") ?? "")
  const principalTotal = Number(formData.get("principalTotal") ?? 0)
  const amortizationRatePct = Number(formData.get("amortizationRatePct") ?? 1.25)
  const label = String(formData.get("label") ?? "Dette hypothécaire")
  const loanKind = String(formData.get("loanKind") ?? "mortgage") === "amortization" ? "amortization" : "mortgage"
  const amortizationMode = toAmortizationMode(formData.get("amortizationMode"))
  const property = await prisma.realEstateProperty.findFirst({ where: { id: propertyId, householdId } })
  if (!property) throw new Error("Bien introuvable")
  await prisma.mortgageLoan.create({
    data: {
      realEstatePropertyId: propertyId,
      label: label || "Dette hypothécaire",
      loanKind,
      amortizationMode,
      principalTotal: principalTotal > 0 ? principalTotal : 0,
      amortizationRatePct: amortizationRatePct > 0 ? amortizationRatePct : 1.25,
    },
  })
  revalidatePath(`/real-estate/${propertyId}/financing`)
  revalidatePath("/real-estate")
}

export async function addMortgageTrancheAction(formData: FormData) {
  const { householdId, userId } = await requireOwnerHousehold()
  const loanId = String(formData.get("loanId") ?? "")
  const loan = await prisma.mortgageLoan.findFirst({
    where: { id: loanId },
    include: { realEstateProperty: true },
  })
  if (!loan || loan.realEstateProperty.householdId !== householdId) throw new Error("Prêt introuvable")
  const principal = Number(formData.get("principal") ?? 0)
  const ratePct = Number(formData.get("ratePct") ?? 0)
  const rateType = toRateType(formData.get("rateType"))
  const name = String(formData.get("name") ?? "").trim() || null
  const startDateRaw = String(formData.get("startDate") ?? "").trim()
  const endDateRaw = String(formData.get("endDate") ?? "").trim()
  const tranche = await prisma.mortgageTranche.create({
    data: {
      mortgageLoanId: loan.id,
      name,
      principal: principal > 0 ? principal : 0,
      ratePct: ratePct >= 0 ? ratePct : 0,
      rateType,
      startDate: startDateRaw ? new Date(startDateRaw) : null,
      endDate: endDateRaw ? new Date(endDateRaw) : null,
    },
  })
  if (tranche.endDate) {
    await createHouseholdTask({
      householdId,
      createdById: userId,
      title: `Échéance hypothécaire — ${loan.realEstateProperty.name}`,
      description: `Tranche ${tranche.name ?? "sans nom"} à échéance le ${tranche.endDate.toISOString().slice(0, 10)}.`,
      dueDate: tranche.endDate,
      realEstatePropertyId: loan.realEstateProperty.id,
      priority: "high",
    })
  }
  revalidatePath(`/real-estate/${loan.realEstateProperty.id}/financing`)
  revalidatePath("/real-estate")
  revalidatePath("/tasks")
}

export async function deleteMortgageTrancheAction(formData: FormData) {
  const { householdId } = await requireOwnerHousehold()
  const trancheId = String(formData.get("trancheId") ?? "")
  const tranche = await prisma.mortgageTranche.findFirst({
    where: { id: trancheId },
    include: { mortgageLoan: { include: { realEstateProperty: true } } },
  })
  if (!tranche || tranche.mortgageLoan.realEstateProperty.householdId !== householdId) throw new Error("Tranche introuvable")
  await prisma.mortgageTranche.delete({ where: { id: trancheId } })
  revalidatePath(`/real-estate/${tranche.mortgageLoan.realEstatePropertyId}/financing`)
  revalidatePath("/real-estate")
}

export async function updateMortgageTrancheAction(formData: FormData) {
  const { householdId } = await requireOwnerHousehold()
  const trancheId = String(formData.get("trancheId") ?? "")
  const tranche = await prisma.mortgageTranche.findFirst({
    where: { id: trancheId },
    include: { mortgageLoan: { include: { realEstateProperty: true } } },
  })
  if (!tranche || tranche.mortgageLoan.realEstateProperty.householdId !== householdId) {
    throw new Error("Tranche introuvable")
  }

  const nameRaw = String(formData.get("name") ?? "").trim()
  const principal = Number(formData.get("principal") ?? 0)
  const ratePct = Number(formData.get("ratePct") ?? 0)
  const rateType = toRateType(formData.get("rateType"))
  const endDateRaw = String(formData.get("endDate") ?? "").trim()
  const startDateRaw = String(formData.get("startDate") ?? "").trim()

  await prisma.mortgageTranche.update({
    where: { id: trancheId },
    data: {
      name: nameRaw || null,
      principal: principal > 0 ? principal : 0,
      ratePct: ratePct >= 0 ? ratePct : 0,
      rateType,
      startDate: startDateRaw ? new Date(startDateRaw) : null,
      endDate: endDateRaw ? new Date(endDateRaw) : null,
    },
  })

  revalidatePath(`/real-estate/${tranche.mortgageLoan.realEstatePropertyId}/financing`)
  revalidatePath("/real-estate")
}

export async function addPropertyChargeAction(formData: FormData) {
  const { householdId } = await requireOwnerHousehold()
  const propertyId = String(formData.get("propertyId") ?? "")
  const property = await prisma.realEstateProperty.findFirst({ where: { id: propertyId, householdId } })
  if (!property) throw new Error("Bien introuvable")
  const label = String(formData.get("label") ?? "").trim() || "Charge"
  const chargeType = String(formData.get("chargeType") ?? "other").trim() || "other"
  const frequency = String(formData.get("frequency") ?? "monthly").trim() || "monthly"
  const amount = Number(formData.get("amount") ?? 0)
  await prisma.propertyCharge.create({
    data: { realEstatePropertyId: propertyId, label, chargeType, frequency, amount: amount > 0 ? amount : 0 },
  })
  revalidatePath(`/real-estate/${propertyId}/operations`)
  revalidatePath("/real-estate")
}

export async function createLeaseUnitAction(formData: FormData) {
  const { householdId } = await requireOwnerHousehold()
  const propertyId = String(formData.get("propertyId") ?? "")
  const property = await prisma.realEstateProperty.findFirst({ where: { id: propertyId, householdId } })
  if (!property) throw new Error("Bien introuvable")
  const label = String(formData.get("label") ?? "").trim() || "Lot principal"
  const tenantName = String(formData.get("tenantName") ?? "").trim() || null
  const rentMonthly = Number(formData.get("rentMonthly") ?? 0)
  const chargesMonthly = Number(formData.get("chargesMonthly") ?? 0)
  const isRented = String(formData.get("isRented") ?? "false") === "true"
  await prisma.leaseUnit.create({
    data: {
      realEstatePropertyId: propertyId,
      label,
      tenantName,
      rentMonthly: rentMonthly > 0 ? rentMonthly : 0,
      chargesMonthly: chargesMonthly > 0 ? chargesMonthly : 0,
      isRented,
    },
  })
  revalidatePath(`/real-estate/${propertyId}/operations`)
  revalidatePath("/real-estate")
}

export async function recordRentPaymentAction(formData: FormData) {
  const { householdId } = await requireOwnerHousehold()
  const leaseUnitId = String(formData.get("leaseUnitId") ?? "")
  const monthRaw = String(formData.get("month") ?? "").trim()
  if (!monthRaw) throw new Error("Mois requis")
  const month = new Date(`${monthRaw}-01`)
  if (Number.isNaN(month.getTime())) throw new Error("Mois invalide")
  const expectedAmount = Number(formData.get("expectedAmount") ?? 0)
  const receivedAmount = Number(formData.get("receivedAmount") ?? 0)
  const lease = await prisma.leaseUnit.findFirst({
    where: { id: leaseUnitId },
    include: { realEstateProperty: true },
  })
  if (!lease || lease.realEstateProperty.householdId !== householdId) throw new Error("Lot introuvable")
  await prisma.rentPayment.upsert({
    where: { leaseUnitId_month: { leaseUnitId, month } },
    update: {
      expectedAmount: expectedAmount > 0 ? expectedAmount : 0,
      receivedAmount: receivedAmount > 0 ? receivedAmount : 0,
      status:
        receivedAmount >= expectedAmount
          ? "paid"
          : receivedAmount > 0
            ? "partial"
            : month.getTime() < Date.now()
              ? "late"
              : "pending",
      receivedAt: receivedAmount > 0 ? new Date() : null,
    },
    create: {
      leaseUnitId,
      month,
      expectedAmount: expectedAmount > 0 ? expectedAmount : 0,
      receivedAmount: receivedAmount > 0 ? receivedAmount : 0,
      status:
        receivedAmount >= expectedAmount
          ? "paid"
          : receivedAmount > 0
            ? "partial"
            : month.getTime() < Date.now()
              ? "late"
              : "pending",
      receivedAt: receivedAmount > 0 ? new Date() : null,
    },
  })
  revalidatePath(`/real-estate/${lease.realEstatePropertyId}/operations`)
  revalidatePath("/real-estate")
}

export async function generateChargeStatementAction(formData: FormData) {
  const { householdId } = await requireOwnerHousehold()
  const propertyId = String(formData.get("propertyId") ?? "")
  const periodStartRaw = String(formData.get("periodStart") ?? "").trim()
  const periodEndRaw = String(formData.get("periodEnd") ?? "").trim()
  const tenantAllocationPct = Number(formData.get("tenantAllocationPct") ?? 100)
  const provisionsPaidByTenant = Number(formData.get("provisionsPaidByTenant") ?? 0)
  const periodStart = periodStartRaw ? new Date(periodStartRaw) : new Date(new Date().getFullYear(), 0, 1)
  const periodEnd = periodEndRaw ? new Date(periodEndRaw) : new Date(new Date().getFullYear(), 11, 31)
  const property = await prisma.realEstateProperty.findFirst({
    where: { id: propertyId, householdId },
    include: {
      charges: true,
      leases: true,
      mortgageLoans: { include: { tranches: true } },
    },
  })
  if (!property) throw new Error("Bien introuvable")
  const financeInputs = buildFinanceInputs(property.mortgageLoans)
  const finance = computeMortgageCharges({
    mortgageTranches: financeInputs.mortgageTranches,
    amortizationEntries: financeInputs.amortizationEntries,
    additionalCharges: property.charges.map((c) => ({
      amount: Number(c.amount),
      frequency: c.frequency as "monthly" | "quarterly" | "annual",
    })),
  })
  const payload = buildChargeStatementPayload({
    periodStart,
    periodEnd,
    tenantAllocationPct,
    tenantName: property.leases[0]?.tenantName ?? null,
    provisionsPaidByTenant,
    mortgageMonthlyCost: finance.monthlyMortgageTotal,
    charges: property.charges.map((c) => ({
      label: c.label,
      amount: Number(c.amount),
      frequency: c.frequency as "monthly" | "quarterly" | "annual",
    })),
  })
  await prisma.chargeStatement.create({
    data: {
      realEstatePropertyId: propertyId,
      periodStart,
      periodEnd,
      tenantAllocationPct: payload.tenantAllocationPct,
      totalChargesAmount: payload.totalCharges,
      totalProvisionsAmount: payload.totalProvisions,
      balanceAmount: payload.balance,
      payload,
    },
  })
  revalidatePath(`/real-estate/${propertyId}/statement`)
}

export async function markChargeStatementNextLetterIntentAction(formData: FormData) {
  const { householdId } = await requireOwnerHousehold()
  const statementId = String(formData.get("statementId") ?? "")
  const statement = await prisma.chargeStatement.findFirst({
    where: { id: statementId },
    include: { realEstateProperty: true },
  })
  if (!statement || statement.realEstateProperty.householdId !== householdId) throw new Error("Décompte introuvable")
  await prisma.chargeStatement.update({
    where: { id: statementId },
    data: { nextLetterIntentAt: new Date() },
  })
  revalidatePath(`/real-estate/${statement.realEstatePropertyId}/statement`)
}

export async function getRealEstatePropertyDetail(propertyId: string) {
  const { householdId } = await requireOwnerHousehold()
  const property = await prisma.realEstateProperty.findFirst({
    where: { id: propertyId, householdId },
    include: {
      mortgageLoans: { include: { tranches: { orderBy: { endDate: "asc" } } } },
      charges: { orderBy: { createdAt: "asc" } },
      leases: { include: { rentPayments: { orderBy: { month: "desc" }, take: 12 } }, orderBy: { createdAt: "asc" } },
      chargeStatements: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  })
  if (!property) return null
  const tranches = property.mortgageLoans
    .filter((l) => l.loanKind !== "amortization")
    .flatMap((l) =>
      l.tranches.map((t) => ({
        id: t.id,
        name: t.name,
        principal: Number(t.principal),
        ratePct: Number(t.ratePct),
        rateType: toRateType(t.rateType),
        endDate: t.endDate,
      }))
    )
  const financeInputs = buildFinanceInputs(property.mortgageLoans)
  const finance = computeMortgageCharges({
    mortgageTranches: financeInputs.mortgageTranches,
    amortizationEntries: financeInputs.amortizationEntries,
    additionalCharges: property.charges.map((c) => ({
      amount: Number(c.amount),
      frequency: c.frequency as "monthly" | "quarterly" | "annual",
    })),
  })
  const alerts = computeMortgageMaturityAlerts(tranches)
  const yieldSummary = computeYieldSummary({
    propertyValue: property.mortgageLoans.reduce((sum, l) => sum + Number(l.principalTotal), 0) || 1,
    rents: property.leases.map((l) => ({
      rentMonthly: Number(l.rentMonthly),
      chargesMonthly: Number(l.chargesMonthly),
      isRented: l.isRented,
    })),
    payments: property.leases.flatMap((l) =>
      l.rentPayments.map((p) => ({
        expectedAmount: Number(p.expectedAmount),
        receivedAmount: Number(p.receivedAmount),
      }))
    ),
    mortgageTranches: tranches.map((t) => ({
      principal: t.principal,
      ratePct: t.ratePct,
      rateType: toRateType(t.rateType),
    })),
    amortizationEntries: financeInputs.amortizationEntries,
    extraCharges: property.charges.map((c) => ({
      amount: Number(c.amount),
      frequency: c.frequency as "monthly" | "quarterly" | "annual",
    })),
  })
  return { property, finance, alerts, yieldSummary }
}

export async function getPropertySimulation(propertyId: string, rateDeltaPct: number) {
  const detail = await getRealEstatePropertyDetail(propertyId)
  if (!detail) return null
  const delta = Number.isFinite(rateDeltaPct) ? rateDeltaPct : 0
  const financeInputs = buildFinanceInputs(
    detail.property.mortgageLoans.map((l) => ({
      ...l,
      tranches: l.tranches.map((t) => ({
        ...t,
        ratePct: l.loanKind === "amortization" ? t.ratePct : Number(t.ratePct) + delta,
      })),
    }))
  )
  const simulation = computeMortgageCharges({
    mortgageTranches: financeInputs.mortgageTranches,
    amortizationEntries: financeInputs.amortizationEntries,
    additionalCharges: detail.property.charges.map((c) => ({
      amount: Number(c.amount),
      frequency: c.frequency as "monthly" | "quarterly" | "annual",
    })),
  })
  return simulation
}

export async function syncMortgageMaturityTasksAction(formData: FormData) {
  const { householdId, userId } = await requireOwnerHousehold()
  const propertyId = String(formData.get("propertyId") ?? "")
  const property = await prisma.realEstateProperty.findFirst({
    where: { id: propertyId, householdId },
    include: { mortgageLoans: { include: { tranches: true } } },
  })
  if (!property) throw new Error("Bien introuvable")

  for (const loan of property.mortgageLoans) {
    for (const tranche of loan.tranches) {
      if (!tranche.endDate) continue
      const title = `Échéance hypothécaire — ${property.name}`
      const existing = await prisma.householdTask.findFirst({
        where: {
          householdId,
          realEstatePropertyId: property.id,
          title,
          dueDate: tranche.endDate,
          status: { in: ["todo", "in_progress", "waiting"] },
        },
        select: { id: true },
      })
      if (existing) continue
      await createHouseholdTask({
        householdId,
        createdById: userId,
        title,
        description: `Tranche ${tranche.name ?? "sans nom"} à échéance le ${tranche.endDate.toISOString().slice(0, 10)}.`,
        dueDate: tranche.endDate,
        realEstatePropertyId: property.id,
        priority: "high",
      })
    }
  }
  revalidatePath(`/real-estate/${property.id}/financing`)
  revalidatePath("/tasks")
}
