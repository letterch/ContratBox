"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function getRealEstateOverview() {
  const session = await auth()
  if (!session?.user?.id) return null
  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
    include: {
      contracts: {
        where: {
          OR: [{ category: "rent_lease" }, { category: "mortgage" }],
        },
      },
    },
  })
  if (!household) return null
  let monthlyIncome = 0
  let monthlyCharges = 0
  for (const c of household.contracts) {
    const raw = (c.rawExtraction ?? {}) as Record<string, unknown>
    if (c.category === "rent_lease") {
      const rent = Number(raw.leaseMonthlyRent ?? c.premiumAmount ?? 0) || 0
      const charges = Number(raw.leaseMonthlyCharges ?? 0) || 0
      const role = String(raw.rentalRole ?? "tenant")
      if (role === "owner") {
        monthlyIncome += rent + charges
      } else {
        monthlyCharges += rent + charges
      }
    } else if (c.category === "mortgage") {
      monthlyCharges += Number(c.premiumAmount ?? 0) || 0
    }
  }
  return {
    contractCount: household.contracts.length,
    monthlyIncome,
    monthlyCharges,
    annualIncome: monthlyIncome * 12,
    annualCharges: monthlyCharges * 12,
    netMonthly: monthlyIncome - monthlyCharges,
  }
}
