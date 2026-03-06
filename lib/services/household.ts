import { prisma } from "@/lib/db"
import type { MemberRole } from "@/lib/constants"

export async function getHouseholdForUser(userId: string) {
  const household = await prisma.household.findFirst({
    where: { ownerId: userId },
    include: {
      members: true,
      _count: { select: { contracts: true } },
    },
  })
  return household
}

export async function getHouseholdWithMembers(householdId: string, userId: string) {
  const household = await prisma.household.findFirst({
    where: { id: householdId, ownerId: userId },
    include: { members: true },
  })
  return household
}

export async function updateHouseholdName(householdId: string, userId: string, name: string) {
  await prisma.household.updateMany({
    where: { id: householdId, ownerId: userId },
    data: { name },
  })
}

export async function createHouseholdMember(
  householdId: string,
  userId: string,
  data: {
    firstName: string
    lastName?: string | null
    role: MemberRole
    dateOfBirth?: Date | null
    notes?: string | null
  }
) {
  const household = await prisma.household.findFirst({
    where: { id: householdId, ownerId: userId },
  })
  if (!household) throw new Error("Ménage introuvable")
  return prisma.householdMember.create({
    data: {
      householdId,
      firstName: data.firstName,
      lastName: data.lastName ?? null,
      role: data.role,
      dateOfBirth: data.dateOfBirth ?? null,
      notes: data.notes ?? null,
    },
  })
}

export async function updateHouseholdMember(
  memberId: string,
  userId: string,
  data: Partial<{
    firstName: string
    lastName: string | null
    role: MemberRole
    dateOfBirth: Date | null
    notes: string | null
  }>
) {
  const member = await prisma.householdMember.findFirst({
    where: { id: memberId },
    include: { household: true },
  })
  if (!member || member.household.ownerId !== userId) throw new Error("Membre introuvable")
  return prisma.householdMember.update({
    where: { id: memberId },
    data,
  })
}

export async function deleteHouseholdMember(memberId: string, userId: string) {
  const member = await prisma.householdMember.findFirst({
    where: { id: memberId },
    include: { household: true },
  })
  if (!member || member.household.ownerId !== userId) throw new Error("Membre introuvable")
  await prisma.householdMember.delete({ where: { id: memberId } })
  return { ok: true }
}
