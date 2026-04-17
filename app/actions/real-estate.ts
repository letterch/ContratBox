"use server"

import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAccessContextForUser, accessCanUseModule, accessTaskQuotaAllows } from "@/lib/services/access-context"
import { createHouseholdTask, countNonArchivedTasks } from "@/lib/services/household-task"

export async function getRealEstateOverview() {
  const session = await auth()
  if (!session?.user?.id) return null
  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
    include: {
      contracts: {
        where: {
          OR: [{ category: "rent_lease" }, { category: "mortgage" }],
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  })
  if (!household) return null
  let monthlyIncome = 0
  let monthlyCharges = 0
  const contracts = household.contracts.map((c) => {
    const raw = (c.rawExtraction ?? {}) as Record<string, unknown>
    if (c.category === "rent_lease") {
      const rent = Number(raw.leaseMonthlyRent ?? c.premiumAmount ?? 0) || 0
      const charges = Number(raw.leaseMonthlyCharges ?? 0) || 0
      const role = String(raw.rentalRole ?? "tenant")
      if (role === "owner") {
        monthlyIncome += rent + charges
      } else {
        monthlyCharges += rent + charges
      }
    } else if (c.category === "mortgage") {
      monthlyCharges += Number(c.premiumAmount ?? 0) || 0
    }
    const leaseEnd =
      raw.leaseEndDate != null
        ? String(raw.leaseEndDate).slice(0, 10)
        : c.endDate
          ? new Date(c.endDate).toISOString().slice(0, 10)
          : null
    return {
      id: c.id,
      title: c.title,
      provider: c.provider,
      category: c.category,
      leaseEndDate: leaseEnd,
      renewalDate: c.renewalDate ? new Date(c.renewalDate).toISOString().slice(0, 10) : null,
    }
  })
  return {
    contractCount: household.contracts.length,
    monthlyIncome,
    monthlyCharges,
    annualIncome: monthlyIncome * 12,
    annualCharges: monthlyCharges * 12,
    netMonthly: monthlyIncome - monthlyCharges,
    contracts,
 }
}

/** Crée une tâche de suivi liée à un bail / prêt immobilier (pilotée par quotas + modules). */
export async function createRealEstateFollowUpTaskAction(formData: FormData) {
  const contractId = String(formData.get("contractId") ?? "")
  if (!contractId) throw new Error("Contrat manquant")
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")
  const ctx = await getAccessContextForUser(session.user.id, session)
  if (!ctx?.household) throw new Error("Ménage introuvable")
  if (!accessCanUseModule(ctx, "module_real_estate")) throw new Error("Module immobilier non disponible")
  if (!accessCanUseModule(ctx, "module_tasks")) throw new Error("Activez une offre avec tâches pour créer un suivi")

  const contract = await prisma.contract.findFirst({
    where: {
      id: contractId,
      householdId: ctx.household.id,
      category: { in: ["rent_lease", "mortgage"] },
    },
  })
  if (!contract) throw new Error("Contrat immobilier introuvable")

  const taskCount = await countNonArchivedTasks(ctx.household.id)
  if (!accessTaskQuotaAllows(ctx, taskCount)) throw new Error("Quota de tâches atteint")

  const label =
    contract.category === "rent_lease"
      ? `Suivi bail — ${contract.provider ?? contract.title ?? "loyer"}`
      : `Suivi hypothèque — ${contract.provider ?? contract.title ?? "prêt"}`

  await createHouseholdTask({
    householdId: ctx.household.id,
    createdById: ctx.userId,
    title: label,
    description: "Créé depuis la vue immobilière — échéances et courriers à préparer selon votre situation.",
    contractId: contract.id,
    priority: contract.category === "mortgage" ? "medium" : "high",
  })
  revalidatePath("/real-estate")
  revalidatePath("/tasks")
  revalidatePath("/dashboard")
}
