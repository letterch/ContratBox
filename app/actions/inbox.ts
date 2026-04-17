"use server"

import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import {
  accessCanUseModule,
  accessInboxQuotaAllows,
  accessTaskQuotaAllows,
  getAccessContextForUser,
} from "@/lib/services/access-context"
import {
  listAdministrativeItems,
  uploadAndAnalyzeInboxItem,
  archiveAdministrativeItem,
  createTaskFromInboxItem,
  countActiveInboxItems,
} from "@/lib/services/administrative-inbox"
import { countNonArchivedTasks } from "@/lib/services/household-task"

async function requireInboxAccess() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")
  const ctx = await getAccessContextForUser(session.user.id, session)
  if (!ctx?.household) throw new Error("Ménage introuvable")
  if (!accessCanUseModule(ctx, "module_inbox")) throw new Error("Offre insuffisante pour l’inbox")
  return { session, ctx, householdId: ctx.household.id }
}

export async function getInboxPageData() {
  const { ctx, householdId } = await requireInboxAccess()
  const items = await listAdministrativeItems(householdId, ctx.userId, 80)
  return { items, householdId }
}

export async function uploadInboxDocumentAction(formData: FormData) {
  const { ctx, householdId } = await requireInboxAccess()
  const count = await countActiveInboxItems(householdId)
  if (!accessInboxQuotaAllows(ctx, count)) throw new Error("Quota inbox atteint pour votre offre.")
  const file = formData.get("file") as File | null
  if (!file) throw new Error("Fichier manquant")
  const result = await uploadAndAnalyzeInboxItem(ctx.userId, householdId, file)
  if (!result.ok) throw new Error(result.error)
  revalidatePath("/inbox")
  revalidatePath("/dashboard")
  return { ok: true as const, itemId: result.itemId }
}

export async function archiveInboxItemAction(itemId: string) {
  const { ctx } = await requireInboxAccess()
  await archiveAdministrativeItem(itemId, ctx.userId)
  revalidatePath("/inbox")
  revalidatePath("/dashboard")
}

export async function createTaskFromInboxAction(itemId: string) {
  const { ctx, householdId } = await requireInboxAccess()
  const taskCount = await countNonArchivedTasks(householdId)
  if (!accessTaskQuotaAllows(ctx, taskCount)) {
    throw new Error("Quota de tâches atteint — archivez ou finalisez des tâches existantes.")
  }
  await createTaskFromInboxItem(itemId, ctx.userId, householdId)
  revalidatePath("/inbox")
  revalidatePath("/tasks")
  revalidatePath("/dashboard")
}
