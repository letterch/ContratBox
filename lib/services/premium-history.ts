import { prisma } from "@/lib/db"
import { monthlyPremiumOf } from "@/lib/config/dashboard-filters"

export type PremiumYearPoint = {
  year: number
  monthlyTotal: number
  annualTotal: number
  contractCount: number
}

/**
 * Enregistre / met à jour le snapshot de prime pour l’année de la police.
 * Utile pour courbes d’augmentation sans conserver d’anciennes polices actives.
 */
export async function upsertContractPremiumSnapshot(input: {
  householdId: string
  contractId: string
  year?: number | null
  provider?: string | null
  category?: string | null
  memberId?: string | null
  policyNumber?: string | null
  premiumAmount?: unknown
  premiumFrequency?: string | null
  startDate?: Date | string | null
  rawExtraction?: unknown
}) {
  const monthly = monthlyPremiumOf({
    category: input.category,
    premiumAmount: input.premiumAmount,
    premiumFrequency: input.premiumFrequency,
    rawExtraction: input.rawExtraction,
  })
  if (monthly <= 0) return null

  const rawYear = (() => {
    if (!input.rawExtraction || typeof input.rawExtraction !== "object") return null
    const raw = input.rawExtraction as Record<string, unknown>
    for (const key of ["policyYear", "coverageYear", "premiumYear", "year"]) {
      const n = Number(raw[key])
      if (Number.isFinite(n) && n >= 1990 && n <= 2100) return n
    }
    return null
  })()
  const year =
    input.year ??
    rawYear ??
    (input.startDate
      ? new Date(input.startDate).getFullYear()
      : new Date().getFullYear())
  if (!Number.isFinite(year) || year < 1990 || year > 2100) return null

  const existing = await prisma.contractPremiumHistory.findFirst({
    where: {
      householdId: input.householdId,
      contractId: input.contractId,
      year,
    },
  })

  const data = {
    provider: input.provider ?? null,
    category: input.category ?? null,
    memberId: input.memberId ?? null,
    policyNumber: input.policyNumber ?? null,
    monthlyPremium: monthly,
    annualPremium: Math.round(monthly * 12 * 100) / 100,
  }

  if (existing) {
    return prisma.contractPremiumHistory.update({
      where: { id: existing.id },
      data,
    })
  }

  return prisma.contractPremiumHistory.create({
    data: {
      householdId: input.householdId,
      contractId: input.contractId,
      year,
      ...data,
    },
  })
}

/** Synchronise un snapshot année courante pour chaque contrat actif. */
export async function syncActiveContractsPremiumSnapshots(
  householdId: string,
  contracts: Array<{
    id: string
    provider?: string | null
    category?: string | null
    memberId?: string | null
    policyNumber?: string | null
    premiumAmount?: unknown
    premiumFrequency?: string | null
    startDate?: Date | string | null
    rawExtraction?: unknown
  }>
) {
  for (const c of contracts) {
    await upsertContractPremiumSnapshot({
      householdId,
      contractId: c.id,
      provider: c.provider,
      category: c.category,
      memberId: c.memberId,
      policyNumber: c.policyNumber,
      premiumAmount: c.premiumAmount,
      premiumFrequency: c.premiumFrequency,
      startDate: c.startDate,
      rawExtraction: c.rawExtraction,
      // année dérivée de startDate (police 2027) sinon année civile courante
    })
  }
}

/** Agrège les primes historiques par année pour le ménage. */
export async function getHouseholdPremiumTrend(
  householdId: string,
  opts?: { categoryGroupSlugs?: string[] | null; memberId?: string | null; householdOnly?: boolean }
): Promise<PremiumYearPoint[]> {
  const rows = await prisma.contractPremiumHistory.findMany({
    where: {
      householdId,
      ...(opts?.memberId ? { memberId: opts.memberId } : {}),
      ...(opts?.householdOnly ? { memberId: null } : {}),
      ...(opts?.categoryGroupSlugs?.length
        ? { category: { in: opts.categoryGroupSlugs } }
        : {}),
    },
    select: { year: true, monthlyPremium: true },
    orderBy: { year: "asc" },
  })

  const byYear = new Map<number, { monthly: number; count: number }>()
  for (const r of rows) {
    const cur = byYear.get(r.year) ?? { monthly: 0, count: 0 }
    cur.monthly += Number(r.monthlyPremium)
    cur.count += 1
    byYear.set(r.year, cur)
  }

  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, v]) => ({
      year,
      monthlyTotal: Math.round(v.monthly * 100) / 100,
      annualTotal: Math.round(v.monthly * 12 * 100) / 100,
      contractCount: v.count,
    }))
}
