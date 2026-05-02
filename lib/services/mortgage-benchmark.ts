/** Taux fixe de référence marché CH (hypothèque) — `MORTGAGE_MARKET_BENCHMARK_RATE_PCT` ex. 1.85 */
export function getMortgageMarketBenchmarkRatePct(): number {
  const raw = process.env.MORTGAGE_MARKET_BENCHMARK_RATE_PCT
  const n = raw ? Number(String(raw).replace(",", ".")) : NaN
  return Number.isFinite(n) && n > 0 ? n : 1.85
}
