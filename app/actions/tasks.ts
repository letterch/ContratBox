"use server"

import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { getAccessContextForUser, accessCanUseModule, accessTaskQuotaAllows } from "@/lib/services/access-context"
import {
  listHouseholdTasks,
  createHouseholdTask,
  updateHouseholdTask,
  archiveHouseholdTask,
  countNonArchivedTasks,
  type ListHouseholdTasksFilters,
} from "@/lib/services/household-task"
import type { HouseholdTaskPriority, HouseholdTaskStatus } from "@/lib/types/household-task"
import { prisma } from "@/lib/db"

async function requireTasksAccess() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")
  const ctx = await getAccessContextForUser(session.user.id, session)
  if (!ctx?.household) throw new Error("Ménage introuvable")
  if (!accessCanUseModule(ctx, "module_tasks")) throw new Error("Offre insuffisante pour les tâches")
  return { session, ctx, householdId: ctx.household.id }
}

export async function getTasksPageData(filters: {
  status: HouseholdTaskStatus | "all"
  priority: HouseholdTaskPriority | "all"
  includeArchived: boolean
}) {
  const { ctx, householdId } = await requireTasksAccess()
  const f: ListHouseholdTasksFilters = {
    status: filters.status,
    priority: filters.priority,
    includeArchived: filters.includeArchived,
  }
  const [tasks, members, contracts] = await Promise.all([
    listHouseholdTasks(householdId, ctx.userId, f, 150),
    prisma.householdMember.findMany({
      where: { householdId },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.contract.findMany({
      where: { householdId },
      select: { id: true, title: true, provider: true },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
  ])
  return { tasks, members, contracts, householdId }
}

export async function createTaskAction(input: {
  title: string
  description?: string | null
  priority?: HouseholdTaskPriority
  dueDate?: string | null
  contractId?: string | null
  assignedToMemberId?: string | null
}) {
  const { ctx, householdId } = await requireTasksAccess()
  const count = await countNonArchivedTasks(householdId)
  if (!accessTaskQuotaAllows(ctx, count)) throw new Error("Quota de tâches atteint pour votre offre.")
  const due = input.dueDate ? new Date(input.dueDate) : null
  await createHouseholdTask({
    householdId,
    createdById: ctx.userId,
    title: input.title.trim(),
    description: input.description ?? null,
    priority: input.priority ?? "medium",
    dueDate: due && !Number.isNaN(due.getTime()) ? due : null,
    contractId: input.contractId ?? null,
    assignedToMemberId: input.assignedToMemberId ?? null,
  })
  revalidatePath("/tasks")
  revalidatePath("/dashboard")
}

export async function updateTaskStatusAction(taskId: string, status: HouseholdTaskStatus) {
  const { ctx } = await requireTasksAccess()
  await updateHouseholdTask(taskId, ctx.userId, { status })
  revalidatePath("/tasks")
  revalidatePath("/dashboard")
}

export async function updateTaskDetailsAction(
  taskId: string,
  patch: Partial<{
    title: string
    description: string | null
    priority: HouseholdTaskPriority
    dueDate: string | null
    contractId: string | null
    assignedToMemberId: string | null
  }>
) {
  const { ctx } = await requireTasksAccess()
  const due = patch.dueDate !== undefined ? (patch.dueDate ? new Date(patch.dueDate) : null) : undefined
  await updateHouseholdTask(taskId, ctx.userId, {
    ...patch,
    dueDate: due,
  })
  revalidatePath("/tasks")
  revalidatePath("/dashboard")
}

export async function archiveTaskAction(taskId: string) {
  const { ctx } = await requireTasksAccess()
  await archiveHouseholdTask(taskId, ctx.userId)
  revalidatePath("/tasks")
  revalidatePath("/dashboard")
}
