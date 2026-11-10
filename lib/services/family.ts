import { prisma } from "@/lib/db"

export async function listFamilyForHousehold(householdId: string) {
  const [members, dependents] = await Promise.all([
    prisma.householdMember.findMany({
      where: { householdId },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
    }),
    prisma.householdDependent.findMany({
      where: { householdId, isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ])
  return { members, dependents }
}

export async function createDependent(input: {
  householdId: string
  type: "child" | "pet"
  name: string
  species?: string | null
  birthDate?: string | null
  notes?: string | null
}) {
  return prisma.householdDependent.create({
    data: {
      householdId: input.householdId,
      type: input.type,
      name: input.name.trim(),
      species: input.species?.trim() || null,
      birthDate: input.birthDate ? new Date(input.birthDate) : null,
      notes: input.notes?.trim() || null,
    },
  })
}

export async function updateDependent(input: {
  id: string
  householdId: string
  name?: string
  species?: string | null
  birthDate?: string | null
  notes?: string | null
  isActive?: boolean
}) {
  return prisma.householdDependent.updateMany({
    where: { id: input.id, householdId: input.householdId },
    data: {
      ...(input.name != null ? { name: input.name.trim() } : {}),
      ...(input.species !== undefined ? { species: input.species?.trim() || null } : {}),
      ...(input.birthDate !== undefined
        ? { birthDate: input.birthDate ? new Date(input.birthDate) : null }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  })
}

export async function createMember(input: {
  householdId: string
  firstName: string
  lastName?: string | null
  role: "adult" | "child" | "other"
  dateOfBirth?: string | null
  notes?: string | null
}) {
  return prisma.householdMember.create({
    data: {
      householdId: input.householdId,
      firstName: input.firstName.trim(),
      lastName: input.lastName?.trim() || null,
      role: input.role,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      notes: input.notes?.trim() || null,
    },
  })
}
