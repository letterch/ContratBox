"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

async function assertReminderAccess(reminderId: string, userId: string) {
  return prisma.reminder.findFirst({
    where: {
      id: reminderId,
      household: { ownerId: userId },
    },
    select: { id: true },
  })
}

export async function dismissReminder(reminderId: string) {
  const session = await auth()
  if (!session?.user?.id) return { ok: false as const, error: "Non authentifié" }
  const row = await assertReminderAccess(reminderId, session.user.id)
  if (!row) return { ok: false as const, error: "Rappel introuvable" }
  await prisma.reminder.update({
    where: { id: reminderId },
    data: { status: "dismissed" },
  })
  revalidatePath("/dashboard")
  revalidatePath("/contracts")
  return { ok: true as const }
}

export async function completeReminder(reminderId: string) {
  const session = await auth()
  if (!session?.user?.id) return { ok: false as const, error: "Non authentifié" }
  const row = await assertReminderAccess(reminderId, session.user.id)
  if (!row) return { ok: false as const, error: "Rappel introuvable" }
  await prisma.reminder.update({
    where: { id: reminderId },
    data: { status: "completed" },
  })
  revalidatePath("/dashboard")
  revalidatePath("/contracts")
  return { ok: true as const }
}

export async function createManualReminderFromContract(input: {
  contractId: string
  title: string
  description: string
  dueDate: string
}) {
  const session = await auth()
  if (!session?.user?.id) return { ok: false as const, error: "Non authentifié" }
  const contract = await prisma.contract.findFirst({
    where: { id: input.contractId, household: { ownerId: session.user.id } },
    select: { id: true, householdId: true },
  })
  if (!contract) return { ok: false as const, error: "Contrat introuvable" }
  const due = new Date(input.dueDate)
  if (Number.isNaN(due.getTime())) return { ok: false as const, error: "Date invalide" }
  const day = due.toISOString().slice(0, 10)
  const dedupeKey = `manual:${contract.id}:${day}:${input.title.slice(0, 40)}`
  const exists = await prisma.reminder.findFirst({
    where: { householdId: contract.householdId, dedupeKey, status: { in: ["pending", "sent"] } },
  })
  if (exists) return { ok: false as const, error: "Rappel déjà présent" }

  await prisma.reminder.create({
    data: {
      householdId: contract.householdId,
      contractId: contract.id,
      type: "contract_renewal",
      title: input.title.slice(0, 200),
      description: input.description.slice(0, 8000),
      dueDate: due,
      urgencyLevel: "medium",
      status: "pending",
      source: "assistant_manual",
      dedupeKey,
    },
  })
  revalidatePath("/dashboard")
  revalidatePath(`/contracts/${contract.id}`)
  revalidatePath("/ai")
  return { ok: true as const }
}
