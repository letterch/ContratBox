"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createDependent, createMember, listFamilyForHousehold, updateDependent } from "@/lib/services/family"

async function requireHousehold() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")
  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true, name: true },
  })
  if (!household) throw new Error("Ménage introuvable")
  return { session, household }
}

export async function getFamilyPageDataAction() {
  const { household } = await requireHousehold()
  const data = await listFamilyForHousehold(household.id)
  return { household, ...data }
}

export async function createMemberAction(formData: FormData) {
  const { household } = await requireHousehold()
  const firstName = String(formData.get("firstName") ?? "").trim()
  if (!firstName) return { ok: false as const, error: "Prénom requis" }
  const roleRaw = String(formData.get("role") ?? "adult")
  const role = (["adult", "child", "other"].includes(roleRaw) ? roleRaw : "adult") as
    | "adult"
    | "child"
    | "other"
  await createMember({
    householdId: household.id,
    firstName,
    lastName: String(formData.get("lastName") ?? "").trim() || null,
    role,
    dateOfBirth: String(formData.get("dateOfBirth") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  })
  revalidatePath("/family")
  revalidatePath("/dashboard")
  return { ok: true as const }
}

export async function createDependentAction(formData: FormData) {
  const { household } = await requireHousehold()
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return { ok: false as const, error: "Nom requis" }
  const typeRaw = String(formData.get("type") ?? "child")
  const type = typeRaw === "pet" ? "pet" : "child"
  await createDependent({
    householdId: household.id,
    type,
    name,
    species: String(formData.get("species") ?? "").trim() || null,
    birthDate: String(formData.get("birthDate") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  })
  revalidatePath("/family")
  return { ok: true as const }
}

export async function deactivateDependentAction(id: string) {
  const { household } = await requireHousehold()
  await updateDependent({ id, householdId: household.id, isActive: false })
  revalidatePath("/family")
  return { ok: true as const }
}
