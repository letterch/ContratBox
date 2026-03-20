"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { calculateCancellationDeadline } from "@/lib/services/contract-deadline"
import { getMortgageAlerts } from "@/lib/services/mortgage"
import { buildHouseholdCostInsights } from "@/lib/services/household-costs"
import { getAppFeatures } from "@/lib/services/feature-flags"
import { getKeyDateFromContractLike } from "@/lib/services/contract-key-date"

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
  const getAlertDate = (contract: {
    renewalDate?: Date | null
    maturityDate?: Date | null
    endDate?: Date | null
    startDate?: Date | null
    rawExtraction?: unknown
  }) => getKeyDateFromContractLike(contract)
  const contractsNearingRenewal = household.contracts
    .map((c) => {
      const alertDate = getAlertDate(c)
      return { contract: c, alertDate }
    })
    .filter(({ alertDate }) => Boolean(alertDate && alertDate >= now && alertDate <= in30Days))
    .map(({ contract, alertDate }) => ({
      ...contract,
      renewalDate: contract.renewalDate ?? alertDate ?? null,
      maturityDate: contract.maturityDate ?? null,
      endDate: contract.endDate ?? null,
    }))
  const contractsWithDerivedDeadline = household.contracts.map((c) => {
    if (c.cancellationDeadline) return c
    const alertDate = getAlertDate(c)
    const raw = (c.rawExtraction ?? {}) as Record<string, unknown>
    const rawNoticeValue = Number(raw.cancellationNoticeValue)
    const rawNoticeUnit = raw.cancellationNoticeUnit as "days" | "months" | "years" | null
    const derived = calculateCancellationDeadline(
      alertDate,
      c.cancellationNoticeDays,
      Number.isFinite(rawNoticeValue) ? rawNoticeValue : null,
      rawNoticeUnit
    )
    return { ...c, cancellationDeadline: derived }
  })
  const contractsInCancellationWindow = contractsWithDerivedDeadline.filter(
    (c) => c.cancellationDeadline && c.cancellationDeadline >= now && c.cancellationDeadline <= in30Days
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
