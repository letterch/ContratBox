import { prisma } from "@/lib/db"
import { FREE_CONTRACT_LIMIT } from "@/lib/constants"
import type { ContractCategorySlug } from "@/lib/constants"
import { accessCanAddContract, getAccessContextForUser } from "@/lib/services/access-context"

export async function getContractsForHousehold(householdId: string, userId: string) {
  const household = await prisma.household.findFirst({
    where: { id: householdId, ownerId: userId },
  })
  if (!household) return []
  return prisma.contract.findMany({
    where: { householdId },
    include: {
      member: true,
      documents: true,
    },
    orderBy: { updatedAt: "desc" },
  })
}

export async function getContractById(contractId: string, userId: string) {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId },
    include: {
      household: true,
      member: true,
      documents: true,
      reminders: {
        where: { status: "pending" },
        orderBy: { dueDate: "asc" },
      },
      decisionInsight: true,
    },
  })
  if (!contract || contract.household.ownerId !== userId) return null
  return contract
}

export async function countContractsForHousehold(householdId: string, userId: string): Promise<number> {
  const household = await prisma.household.findFirst({
    where: { id: householdId, ownerId: userId },
  })
  if (!household) return 0
  return prisma.contract.count({ where: { householdId } })
}

export async function canAddContract(userId: string): Promise<{ allowed: boolean; count: number; limit: number }> {
  const ctx = await getAccessContextForUser(userId, null)
  if (!ctx?.household) {
    return { allowed: false, count: 0, limit: FREE_CONTRACT_LIMIT }
  }
  const count = ctx.household.contractCount
  const max = ctx.entitlements.quotas.maxContracts
  const allowed = accessCanAddContract(ctx)
  const limit = max ?? 999_999
  return { allowed, count, limit }
}

export type CreateContractInput = {
  householdId: string
  createdById: string
  title?: string | null
  provider?: string | null
  contractType?: string | null
  category?: ContractCategorySlug | null
  policyNumber?: string | null
  memberId?: string | null
  isHouseholdWide: boolean
  premiumAmount?: number | null
  premiumFrequency?: string | null
  startDate?: Date | null
  renewalDate?: Date | null
  endDate?: Date | null
  maturityDate?: Date | null
  cancellationNoticeDays?: number | null
  cancellationDeadline?: Date | null
  autoRenewal?: boolean | null
  mortgageRate?: number | null
  interestAmountPaid?: number | null
  extractedText?: string | null
  extractionConfidence?: number | null
  coverageSummary?: string | null
  exclusions?: string | null
  importantClauses?: string | null
  rawExtraction?: object | null
  documentIds?: string[]
}

export async function createContract(data: CreateContractInput) {
  const household = await prisma.household.findFirst({
    where: { id: data.householdId, ownerId: data.createdById },
  })
  if (!household) throw new Error("Ménage introuvable")

  const { documentIds, ...contractData } = data
  const contract = await prisma.contract.create({
    data: {
      ...contractData,
      currency: "CHF",
      extractedAt: contractData.rawExtraction ? new Date() : null,
    },
  })
  if (documentIds?.length) {
    await prisma.document.updateMany({
      where: { id: { in: documentIds } },
      data: { contractId: contract.id },
    })
  }
  return contract
}

export async function updateContract(
  contractId: string,
  userId: string,
  data: Partial<CreateContractInput>
) {
  const contract = await getContractById(contractId, userId)
  if (!contract) throw new Error("Contrat introuvable")
  const { documentIds, ...rest } = data
  const update: Record<string, unknown> = { ...rest }
  if (documentIds !== undefined) {
    await prisma.document.updateMany({
      where: { contractId },
      data: { contractId: contract.id },
    })
  }
  return prisma.contract.update({
    where: { id: contractId },
    data: update as Parameters<typeof prisma.contract.update>[0]["data"],
  })
}
