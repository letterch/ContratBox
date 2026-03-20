"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function getHouseholdData() {
  const session = await auth()
  if (!session?.user?.id) return { household: null, members: [] }
  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
    include: {
      members: {
        orderBy: { createdAt: "asc" },
      },
      contracts: {
        select: { memberId: true },
      },
    },
  })
  if (!household) return { household: null, members: [] }
  const members = household.members.map((m) => ({
    ...m,
    contractCount: household.contracts.filter((c) => c.memberId === m.id).length,
  }))
  return {
    household: { id: household.id, name: household.name },
    members,
  }
}

export async function addHouseholdMember(input: {
  firstName: string
  lastName?: string | null
  role?: string | null
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")
  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
  })
  if (!household) throw new Error("Ménage introuvable")
  const firstName = input.firstName.trim()
  if (!firstName) throw new Error("Le prénom est requis")
  const member = await prisma.householdMember.create({
    data: {
      householdId: household.id,
      firstName,
      lastName: input.lastName?.trim() || null,
      role: input.role?.trim() || "adult",
    },
  })
  return member
}

export async function removeHouseholdMember(memberId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")
  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
  })
  if (!household) throw new Error("Ménage introuvable")
  const member = await prisma.householdMember.findFirst({
    where: { id: memberId, householdId: household.id },
  })
  if (!member) throw new Error("Membre introuvable")
  await prisma.householdMember.delete({ where: { id: memberId } })
  return { ok: true }
}
