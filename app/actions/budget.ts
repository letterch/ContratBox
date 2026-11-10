"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  createIncome,
  deleteIncome,
  getBudgetOverview,
  listBudgetEnvelopes,
  listIncomes,
  upsertBudgetEnvelope,
} from "@/lib/services/budget"
import { getAccessContextForUser, accessCanUseModule } from "@/lib/services/access-context"

async function requireBudgetAccess() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")
  const access = await getAccessContextForUser(session.user.id, session)
  if (!access || !accessCanUseModule(access, "module_budget")) {
    throw new Error("Module budget non disponible")
  }
  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true, name: true },
  })
  if (!household) throw new Error("Ménage introuvable")
  return { session, household }
}

export async function getBudgetPageDataAction() {
  const { household } = await requireBudgetAccess()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const [overview, incomes, envelopes, members] = await Promise.all([
    getBudgetOverview(household.id),
    listIncomes(household.id),
    listBudgetEnvelopes(household.id, year, month),
    prisma.householdMember.findMany({
      where: { householdId: household.id },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ])
  return {
    household,
    year,
    month,
    cashflow: overview.cashflow,
    incomes,
    envelopes,
    members,
  }
}

export async function createIncomeAction(formData: FormData) {
  const { session, household } = await requireBudgetAccess()
  const name = String(formData.get("name") ?? "").trim()
  const amount = Number(String(formData.get("amount") ?? "").replace(",", "."))
  if (!name || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, error: "Nom et montant valides requis" }
  }
  const memberRaw = String(formData.get("memberId") ?? "")
  await createIncome({
    householdId: household.id,
    createdById: session.user.id,
    name,
    amount,
    frequency: String(formData.get("frequency") ?? "monthly"),
    category: String(formData.get("category") ?? "salary"),
    scope: memberRaw && memberRaw !== "__none__" ? "personal" : "family",
    memberId: memberRaw && memberRaw !== "__none__" ? memberRaw : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  })
  revalidatePath("/budget")
  revalidatePath("/dashboard")
  return { ok: true as const }
}

export async function deleteIncomeAction(id: string) {
  const { household } = await requireBudgetAccess()
  await deleteIncome(id, household.id)
  revalidatePath("/budget")
  revalidatePath("/dashboard")
  return { ok: true as const }
}

export async function saveEnvelopeAction(formData: FormData) {
  const { household } = await requireBudgetAccess()
  const name = String(formData.get("name") ?? "").trim()
  const amount = Number(String(formData.get("amount") ?? "").replace(",", "."))
  const month = Number(formData.get("month"))
  const year = Number(formData.get("year"))
  if (!name || !Number.isFinite(amount) || amount < 0) {
    return { ok: false as const, error: "Nom et montant valides requis" }
  }
  await upsertBudgetEnvelope({
    householdId: household.id,
    name,
    amount,
    category: String(formData.get("category") ?? "other"),
    month: Number.isFinite(month) ? month : new Date().getMonth() + 1,
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
  })
  revalidatePath("/budget")
  return { ok: true as const }
}
