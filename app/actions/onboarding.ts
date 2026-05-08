"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ensureInboundEmailToken } from "@/lib/services/inbound-email"

export async function updateOnboardingAction(householdName: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) throw new Error("Utilisateur introuvable")

  let household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "asc" },
  })

  if (!household) {
    household = await prisma.household.create({
      data: {
        ownerId: session.user.id,
        name: householdName,
      },
    })
  } else {
    await prisma.household.update({
      where: { id: household.id },
      data: { name: householdName },
    })
  }

  const existingMember = await prisma.householdMember.findFirst({
    where: { householdId: household.id, userId: session.user.id },
  })
  if (!existingMember) {
    await prisma.householdMember.create({
      data: {
        householdId: household.id,
        userId: session.user.id,
        firstName: user.name?.split(" ")[0] ?? "Utilisateur",
        lastName: user.name?.split(" ").slice(1).join(" ") ?? null,
        role: "adult",
      },
    })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingCompletedAt: new Date() },
  })

  // Génère le token d'email entrant pour activer l'adresse `factures+<token>@…` du user.
  await ensureInboundEmailToken(session.user.id).catch((err) => {
    console.error("[onboarding] ensureInboundEmailToken failed", err)
  })

  return { ok: true }
}
