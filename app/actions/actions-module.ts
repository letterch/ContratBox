"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getAccessContextForUser, accessCanUseModule } from "@/lib/services/access-context"
import {
  createBillDisputeAction,
  createContractCancellationAction,
  listActionsForHousehold,
  suggestActionsFromContracts,
  updateActionStatus,
} from "@/lib/services/nextletter-actions"

async function requireActionsAccess() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")
  const access = await getAccessContextForUser(session.user.id, session)
  if (!access || !accessCanUseModule(access, "module_actions")) {
    throw new Error("Module actions non disponible")
  }
  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true, name: true },
  })
  if (!household) throw new Error("Ménage introuvable")
  return { session, household, userName: session.user.name ?? null }
}

export async function getActionsPageDataAction() {
  const { household } = await requireActionsAccess()
  const [logs, contracts, bills] = await Promise.all([
    listActionsForHousehold(household.id),
    prisma.contract.findMany({
      where: { householdId: household.id, status: "active" },
      select: {
        id: true,
        title: true,
        provider: true,
        cancellationDeadline: true,
        status: true,
      },
      orderBy: { cancellationDeadline: "asc" },
    }),
    prisma.bill.findMany({
      where: { householdId: household.id, status: { in: ["pending", "overdue", "disputed"] } },
      select: { id: true, title: true, provider: true, amount: true, status: true },
      take: 30,
      orderBy: { dueDate: "asc" },
    }),
  ])
  const suggestions = suggestActionsFromContracts(contracts)
  return { household, logs, contracts, bills, suggestions }
}

export async function draftCancellationForContractAction(contractId: string) {
  const { session, household, userName } = await requireActionsAccess()
  const result = await createContractCancellationAction({
    householdId: household.id,
    userId: session.user.id,
    contractId,
    senderName: userName,
  })
  revalidatePath("/actions")
  return {
    ok: true as const,
    actionId: result.action.id,
    letterBody: result.letterBody,
    nextLetterUrl: result.nextLetterUrl,
  }
}

export async function draftDisputeForBillAction(billId: string, reason?: string) {
  const { session, household, userName } = await requireActionsAccess()
  const result = await createBillDisputeAction({
    householdId: household.id,
    userId: session.user.id,
    billId,
    reason,
    senderName: userName,
  })
  revalidatePath("/actions")
  return {
    ok: true as const,
    actionId: result.action.id,
    letterBody: result.letterBody,
    nextLetterUrl: result.nextLetterUrl,
  }
}

export async function markActionCopiedAction(id: string) {
  const { household } = await requireActionsAccess()
  await updateActionStatus({ id, householdId: household.id, status: "copied" })
  revalidatePath("/actions")
  return { ok: true as const }
}

export async function markActionOpenedNextLetterAction(id: string) {
  const { household } = await requireActionsAccess()
  await updateActionStatus({ id, householdId: household.id, status: "opened_nextletter" })
  revalidatePath("/actions")
  return { ok: true as const }
}
