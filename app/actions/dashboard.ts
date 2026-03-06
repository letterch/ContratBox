"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function getDashboardData() {
  const session = await auth()
  if (!session?.user?.id) return null

  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
    include: {
      members: true,
      contracts: {
        include: { member: true },
        orderBy: { renewalDate: "asc" },
      },
    },
  })
  if (!household) return null

  const now = new Date()
  const in30Days = new Date(now)
  in30Days.setDate(in30Days.getDate() + 30)
  const contractsNearingRenewal = household.contracts.filter(
    (c) => c.renewalDate && c.renewalDate >= now && c.renewalDate <= in30Days
  )
  const contractsInCancellationWindow = household.contracts.filter(
    (c) => c.cancellationDeadline && c.cancellationDeadline >= now
  )

  let monthlyTotal = 0
  let annualTotal = 0
  for (const c of household.contracts) {
    if (c.premiumAmount) {
      const n = Number(c.premiumAmount)
      if (c.premiumFrequency === "monthly") monthlyTotal += n
      else if (c.premiumFrequency === "annual") annualTotal += n
      else monthlyTotal += n
    }
  }

  return {
    household: {
      id: household.id,
      name: household.name,
      memberCount: household.members.length,
      contractCount: household.contracts.length,
      members: household.members,
    },
    totals: {
      monthly: monthlyTotal,
      annual: annualTotal,
    },
    contractsNearingRenewal,
    contractsInCancellationWindow,
    recentContracts: household.contracts.slice(0, 6),
    contracts: household.contracts,
  }
}

export async function getContractsList() {
  const data = await getDashboardData()
  if (!data) return { contracts: [], members: [], categories: [] }
  const categories = [...new Set(data.contracts.map((c) => c.category).filter(Boolean))] as string[]
  return {
    contracts: data.contracts,
    members: data.household.members,
    categories,
  }
}
