"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function updateOnboardingAction(householdName: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { households: { where: { ownerId: session.user.id } } },
  })
  if (!user) throw new Error("Utilisateur introuvable")

  const household = user.households[0]
  if (!household) throw new Error("Aucun ménage trouvé")

  await prisma.household.update({
    where: { id: household.id },
    data: { name: householdName },
  })

  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingCompletedAt: new Date() },
  })

  return { ok: true }
}
