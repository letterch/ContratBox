"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { calculateCancellationDeadline } from "@/lib/services/contract-deadline"
import { getMortgageAlerts } from "@/lib/services/mortgage"
import { buildHouseholdCostInsights } from "@/lib/services/household-costs"
import { getAppFeatures } from "@/lib/services/feature-flags"

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
  const features = await getAppFeatures()
  const in30Days = new Date(now)
  in30Days.setDate(in30Days.getDate() + 30)
  const contractsNearingRenewal = household.contracts.filter((c) => {
    const renewalSoon = c.renewalDate && c.renewalDate >= now && c.renewalDate <= in30Days
    const maturitySoon = c.maturityDate && c.maturityDate >= now && c.maturityDate <= in30Days
    const leaseEndSoon = c.endDate && c.endDate >= now && c.endDate <= in30Days
    return Boolean(renewalSoon || maturitySoon || leaseEndSoon)
  })
  const contractsWithDerivedDeadline = household.contracts.map((c) => {
    if (c.cancellationDeadline) return c
    const derived = calculateCancellationDeadline(c.renewalDate, c.cancellationNoticeDays)
    return { ...c, cancellationDeadline: derived }
  })
  const contractsInCancellationWindow = contractsWithDerivedDeadline.filter(
    (c) => c.cancellationDeadline && c.cancellationDeadline >= now
  )
  const mortgageAlerts = getMortgageAlerts(contractsWithDerivedDeadline, 180)

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
  const costInsights = buildHouseholdCostInsights(
    household.contracts.map((c) => ({
      id: c.id,
      provider: c.provider,
      category: c.category,
      premiumAmount: c.premiumAmount,
      premiumFrequency: c.premiumFrequency,
      rawExtraction: c.rawExtraction,
    })),
    {
      housingRatioTarget: features.optimizerHousingRatioTarget,
      telecomMonthlyTarget: features.optimizerTelecomMonthlyTarget,
      energyMonthlyTarget: features.optimizerEnergyMonthlyTarget,
    }
  )

  return {
    household: {
      id: household.id,
      name: household.name,
      memberCount: household.members.length,
      contractCount: household.contracts.length,
      members: household.members,
    },
    totals: {
      monthly: Math.max(monthlyTotal, costInsights.monthlyTotal),
      annual: Math.max(annualTotal, costInsights.annualTotal),
    },
    costInsights: features.globalSavingsAssistantEnabled ? costInsights : null,
    features,
    contractsNearingRenewal,
    contractsInCancellationWindow,
    mortgageAlerts,
    recentContracts: contractsWithDerivedDeadline.slice(0, 6),
    contracts: contractsWithDerivedDeadline,
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
