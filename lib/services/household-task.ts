import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import type { HouseholdTaskPriority, HouseholdTaskStatus } from "@/lib/types/household-task"
import { isHouseholdTaskPriority, isHouseholdTaskStatus } from "@/lib/types/household-task"

export type ListHouseholdTasksFilters = {
  status?: HouseholdTaskStatus | "all"
  priority?: HouseholdTaskPriority | "all"
  includeArchived?: boolean
}

export async function countNonArchivedTasks(householdId: string): Promise<number> {
  return prisma.householdTask.count({
    where: { householdId, status: { not: "archived" } },
  })
}

export async function assertHouseholdOwner(householdId: string, userId: string) {
  const h = await prisma.household.findFirst({
    where: { id: householdId, ownerId: userId },
    select: { id: true },
  })
  if (!h) throw new Error("Ménage introuvable ou accès refusé")
}

export async function listHouseholdTasks(
  householdId: string,
  userId: string,
  filters: ListHouseholdTasksFilters,
  take = 100
) {
  await assertHouseholdOwner(householdId, userId)
  const where: Prisma.HouseholdTaskWhereInput = { householdId }
  if (!filters.includeArchived && filters.status !== "archived") {
    if (filters.status && filters.status !== "all") {
      where.status = filters.status
    } else {
      where.status = { not: "archived" }
    }
  } else if (filters.status && filters.status !== "all") {
    where.status = filters.status
  }
  if (filters.priority && filters.priority !== "all") {
    where.priority = filters.priority
  }
  return prisma.householdTask.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take,
    include: {
      contract: { select: { id: true, title: true, provider: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
  })
}

export async function getDashboardTaskPreview(householdId: string, userId: string, limit = 5) {
  await assertHouseholdOwner(householdId, userId)
  return prisma.householdTask.findMany({
    where: {
      householdId,
      status: { in: ["todo", "in_progress", "waiting"] },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
    },
  })
}

export type CreateHouseholdTaskInput = {
  householdId: string
  createdById: string
  title: string
  description?: string | null
  status?: HouseholdTaskStatus
  priority?: HouseholdTaskPriority
  dueDate?: Date | null
  contractId?: string | null
  realEstatePropertyId?: string | null
  assignedToMemberId?: string | null
  sourceAdministrativeItemId?: string | null
}

export async function createHouseholdTask(input: CreateHouseholdTaskInput) {
  await assertHouseholdOwner(input.householdId, input.createdById)
  if (input.contractId) {
    const c = await prisma.contract.findFirst({
      where: { id: input.contractId, householdId: input.householdId },
      select: { id: true },
    })
    if (!c) throw new Error("Contrat invalide pour ce ménage")
  }
  if (input.realEstatePropertyId) {
    const p = await prisma.realEstateProperty.findFirst({
      where: { id: input.realEstatePropertyId, householdId: input.householdId },
      select: { id: true },
    })
    if (!p) throw new Error("Bien immobilier invalide pour ce ménage")
  }
  if (input.assignedToMemberId) {
    const m = await prisma.householdMember.findFirst({
      where: { id: input.assignedToMemberId, householdId: input.householdId },
      select: { id: true },
    })
    if (!m) throw new Error("Membre invalide pour ce ménage")
  }
  if (input.sourceAdministrativeItemId) {
    const item = await prisma.administrativeItem.findFirst({
      where: { id: input.sourceAdministrativeItemId, householdId: input.householdId, status: "active" },
      select: { id: true },
    })
    if (!item) throw new Error("Document inbox introuvable")
    const existing = await prisma.householdTask.findFirst({
      where: { sourceAdministrativeItemId: input.sourceAdministrativeItemId },
      select: { id: true },
    })
    if (existing) throw new Error("Une tâche existe déjà pour ce document")
  }
  return prisma.householdTask.create({
    data: {
      householdId: input.householdId,
      createdById: input.createdById,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      dueDate: input.dueDate ?? null,
      contractId: input.contractId ?? null,
      realEstatePropertyId: input.realEstatePropertyId ?? null,
      assignedToMemberId: input.assignedToMemberId ?? null,
      sourceAdministrativeItemId: input.sourceAdministrativeItemId ?? null,
    },
  })
}

export async function updateHouseholdTask(
  taskId: string,
  userId: string,
  data: Partial<{
    title: string
    description: string | null
    status: HouseholdTaskStatus
    priority: HouseholdTaskPriority
    dueDate: Date | null
    contractId: string | null
    assignedToMemberId: string | null
  }>
) {
  const task = await prisma.householdTask.findFirst({
    where: { id: taskId },
    include: { household: { select: { ownerId: true, id: true } } },
  })
  if (!task || task.household.ownerId !== userId) throw new Error("Tâche introuvable")
  const patch: Record<string, unknown> = {}
  if (data.title !== undefined) patch.title = data.title
  if (data.description !== undefined) patch.description = data.description
  if (data.status !== undefined) {
    if (!isHouseholdTaskStatus(data.status)) throw new Error("Statut invalide")
    patch.status = data.status
  }
  if (data.priority !== undefined) {
    if (!isHouseholdTaskPriority(data.priority)) throw new Error("Priorité invalide")
    patch.priority = data.priority
  }
  if (data.dueDate !== undefined) patch.dueDate = data.dueDate
  if (data.contractId !== undefined) {
    if (data.contractId) {
      const c = await prisma.contract.findFirst({
        where: { id: data.contractId, householdId: task.householdId },
        select: { id: true },
      })
      if (!c) throw new Error("Contrat invalide")
    }
    patch.contractId = data.contractId
  }
  if (data.assignedToMemberId !== undefined) {
    if (data.assignedToMemberId) {
      const m = await prisma.householdMember.findFirst({
        where: { id: data.assignedToMemberId, householdId: task.householdId },
        select: { id: true },
      })
      if (!m) throw new Error("Membre invalide")
    }
    patch.assignedToMemberId = data.assignedToMemberId
  }
  return prisma.householdTask.update({
    where: { id: taskId },
    data: patch as Parameters<typeof prisma.householdTask.update>[0]["data"],
  })
}

export async function archiveHouseholdTask(taskId: string, userId: string) {
  return updateHouseholdTask(taskId, userId, { status: "archived" })
}
