import { getMortgageMarketBenchmarkRatePct } from "@/lib/services/mortgage-benchmark"
import { parseUnknownDate } from "@/lib/services/contract-key-date"
import { getMortgagePlan, type ContractLike } from "@/lib/services/mortgage"

export type MortgageContractDecision = {
  savingsPotential: number
  expiresInDays: number
  recommendation: "renegotiate" | "keep"
}

type Input = ContractLike & { category?: string | null }

function asNumericRate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (value && typeof value === "object" && "toNumber" in value) {
    const n = (value as { toNumber: () => number }).toNumber()
    return typeof n === "number" && Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Décision « argent » sur une hypothèque : échéance la plus proche vs taux marché de référence.
 */
export function analyzeMortgageContractDecision(contract: Input): MortgageContractDecision | null {
  if (contract.category !== "mortgage") return null
  const market = getMortgageMarketBenchmarkRatePct()
  const plan = getMortgagePlan(contract)

  let expiresInDays = 9999
  let weightedRateSum = 0
  let principalSum = 0
  let savingsPotential = 0

  if (plan.isMortgage && plan.tranches.length > 0) {
    for (const t of plan.tranches) {
      if (t.principal > 0) {
        weightedRateSum += t.annualRate * t.principal
        principalSum += t.principal
        const delta = Math.max(0, t.annualRate - market)
        savingsPotential += Math.round((t.principal * delta) / 100)
      }
      if (t.daysToMaturity != null && t.daysToMaturity >= 0) {
        expiresInDays = Math.min(expiresInDays, t.daysToMaturity)
      }
    }
  } else {
    const raw = (contract.rawExtraction ?? {}) as Record<string, unknown>
    const maturity =
      contract.maturityDate ? new Date(contract.maturityDate) : parseUnknownDate(raw.maturityDate)
    if (maturity && !Number.isNaN(maturity.getTime())) {
      expiresInDays = Math.max(
        0,
        Math.ceil((maturity.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      )
    }
    const rate = asNumericRate(contract.mortgageRate) ?? (Number(raw.mortgageRate) || null)
    const principal = Number(raw.mortgagePrincipal) || 0
    if (rate != null && principal > 0) {
      weightedRateSum = rate * principal
      principalSum = principal
      savingsPotential = Math.round((principal * Math.max(0, rate - market)) / 100)
    }
  }

  if (principalSum <= 0 && expiresInDays >= 9990) {
    return null
  }

  const avgRate = principalSum > 0 ? weightedRateSum / principalSum : 0
  const rateGap = avgRate - market
  const renegotiateBecauseRate = rateGap > 0.35 && principalSum > 50_000
  const renegotiateBecauseMaturity = expiresInDays <= 540 && expiresInDays >= 0
  const recommendation: "renegotiate" | "keep" =
    savingsPotential >= 800 || renegotiateBecauseRate || (renegotiateBecauseMaturity && rateGap > 0.15)
      ? "renegotiate"
      : "keep"

  return {
    savingsPotential,
    expiresInDays: expiresInDays > 365 * 25 ? 9999 : expiresInDays,
    recommendation,
  }
}
