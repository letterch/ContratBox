import {
  computeMortgageCharges,
  toMonthlyAmount,
  type Frequency,
  type MortgageTrancheInput,
} from "@/lib/services/real-estate/finance"
import { isPrimaryResidence, type InvestmentKind } from "@/lib/services/real-estate/investment-kind"

/**
 * Vue « gestion immobilière » d’un bien : tout ce qu’il faut savoir pour la
 * carte d’un bien (financement, charges PPE, baux, totaux) + agrégation pour
 * le tableau de bord.
 */
export type PropertyTrancheView = {
  id: string
  name: string | null
  principal: number
  ratePct: number
  rateType: "fixed" | "saron"
  startDate: Date | null
  endDate: Date | null
}

export type PropertyChargeView = {
  id: string
  label: string
  chargeType: string
  amount: number
  frequency: Frequency
  monthlyEquivalent: number
}

export type PropertyLeaseView = {
  id: string
  label: string
  tenantName: string | null
  isRented: boolean
  rentMonthly: number
  chargesMonthly: number
  startDate: Date | null
  endDate: Date | null
  monthlyTotal: number
}

export type PropertyMortgageView = {
  loanId: string
  label: string
  /** mortgage | amortization */
  loanKind: "mortgage" | "amortization"
  /** Mode d'amortissement par défaut de la ligne (si loanKind=amortization). */
  amortizationMode: "direct" | "indirect"
  /** Capital pris en compte pour les intérêts (somme tranches sinon principalTotal). */
  totalDebt: number
  /** Taux moyen pondéré sur les tranches (si aucune tranche : taux de la ligne). */
  weightedRatePct: number
  /** True si le prêt a été saisi sans tranches détaillées (ancien modèle). */
  isVirtual: boolean
  tranches: PropertyTrancheView[]
  /** Capital saisi sur le prêt (si pas de tranches). */
  principalTotal: number
  /** Taux par défaut du prêt (si pas de tranches). */
  ratePct: number
}

export type PropertyComputedFinance = {
  /** Capital total servant aux intérêts (somme tranches OU principal du prêt). */
  totalDebt: number
  /** Taux moyen pondéré (intérêts) en %. */
  weightedRatePct: number
  /** Intérêts annuels (CHF). */
  annualInterest: number
  /** Intérêts mensuels (CHF). */
  monthlyInterest: number
  /** Taux d’amortissement appliqué au bien (%). */
  amortizationRatePct: number
  /** Mode d’amortissement par défaut du bien. */
  amortizationMode: "direct" | "indirect"
  /** Amortissement annuel = dette × taux d’amortissement (%) / 100. */
  annualAmortization: number
  monthlyAmortization: number
  /** Charges PPE / autres (équivalent mensuel). */
  monthlyExtraCharges: number
  /** Coût mensuel total banque (intérêts + amortissement). */
  monthlyMortgageCost: number
  /** Coût mensuel total propriétaire (banque + charges PPE). */
  monthlyTotalCost: number
}

export type PropertyView = {
  id: string
  name: string
  address: string | null
  propertyType: string
  investmentKind: InvestmentKind
  /** Bien locatif vs résidence principale. */
  isPrimaryResidence: boolean
  purchaseValueChf: number | null
  purchaseDate: Date | null
  valuationChf: number | null
  /** Plus-value latente (valeur actuelle - prix d’achat) si les deux sont définis. */
  capitalGainChf: number | null
  capitalGainPct: number | null
  /** Vue agrégée du financement (premier prêt mortgage). Conservée pour compat. */
  mortgage: PropertyMortgageView | null
  /** Liste détaillée de tous les prêts du bien (intérêts + amortissement legacy). */
  mortgageLoans: PropertyMortgageView[]
  charges: PropertyChargeView[]
  leases: PropertyLeaseView[]
  finance: PropertyComputedFinance
  /** Loyers mensuels potentiels = somme des loyers + charges des baux marqués loués. */
  monthlyRentalIncome: number
  /** Solde mensuel = loyers - charges totales (négatif si vous payez plus que vous encaissez). */
  monthlyNetCashflow: number
}

export type PortfolioSummary = {
  propertyCount: number
  rentalCount: number
  primaryCount: number
  /** Charges totales mensuelles (banque + PPE) tous biens confondus. */
  monthlyTotalCost: number
  monthlyMortgageInterest: number
  monthlyMortgageAmortization: number
  monthlyExtraCharges: number
  /** Loyers encaissables (biens loués). */
  monthlyRentalIncome: number
  /** Cashflow net = loyers - charges. */
  monthlyNetCashflow: number
  annualTotalCost: number
  annualRentalIncome: number
  annualNetCashflow: number
  totalDebt: number
  totalValuation: number
  totalPurchaseValue: number
  /** Plus-value latente cumulée (si toutes valeurs renseignées). */
  totalCapitalGain: number | null
}

type PrismaTrancheLike = {
  id: string
  name: string | null
  principal: { toString(): string } | number
  ratePct: { toString(): string } | number
  rateType: string
  startDate: Date | null
  endDate: Date | null
}

type PrismaLoanLike = {
  id: string
  label: string
  loanKind: string
  amortizationMode: string
  principalTotal: { toString(): string } | number
  amortizationRatePct: { toString(): string } | number
  tranches: PrismaTrancheLike[]
}

type PrismaChargeLike = {
  id: string
  label: string
  chargeType: string
  amount: { toString(): string } | number
  frequency: string
}

type PrismaLeaseLike = {
  id: string
  label: string
  tenantName: string | null
  isRented: boolean
  rentMonthly: { toString(): string } | number
  chargesMonthly: { toString(): string } | number
  startDate: Date | null
  endDate: Date | null
}

type PrismaPropertyLike = {
  id: string
  name: string
  address: string | null
  propertyType: string
  investmentKind: string
  purchaseValueChf: { toString(): string } | number | null
  purchaseDate: Date | null
  valuationChf: { toString(): string } | number | null
  amortizationRatePct: { toString(): string } | number
  amortizationMode: string
  mortgageLoans: PrismaLoanLike[]
  charges: PrismaChargeLike[]
  leases: PrismaLeaseLike[]
}

function decimalToNumber(v: { toString(): string } | number | null | undefined): number {
  if (v == null) return 0
  if (typeof v === "number") return Number.isFinite(v) ? v : 0
  const n = Number(v.toString())
  return Number.isFinite(n) ? n : 0
}

function decimalToNullable(v: { toString(): string } | number | null | undefined): number | null {
  if (v == null) return null
  const n = decimalToNumber(v)
  return n > 0 ? n : null
}

function rateType(v: string): "fixed" | "saron" {
  return v === "saron" ? "saron" : "fixed"
}

function amortizationMode(v: string): "direct" | "indirect" {
  return v === "indirect" ? "indirect" : "direct"
}

function freq(v: string): Frequency {
  return v === "annual" || v === "quarterly" ? v : "monthly"
}

/**
 * Calcule le financement « simplifié » du bien :
 * - intérêts = somme(tranche.principal × tranche.taux/100), sinon principalTotal × taux ligne
 * - amortissement = dette totale × taux amortissement % / 100 (taux niveau bien)
 * - charges PPE = équivalent mensuel des charges récurrentes
 *
 * Compatibilité ascendante : si l’ancien schéma avait une ligne `loanKind="amortization"`,
 * on utilise sa valeur en priorité comme amortissement plutôt que de doubler.
 */
function computePropertyFinance(p: PrismaPropertyLike): {
  finance: PropertyComputedFinance
  mortgage: PropertyMortgageView | null
  mortgageLoansView: PropertyMortgageView[]
} {
  const mortgageLoans = p.mortgageLoans.filter((l) => l.loanKind !== "amortization")
  const legacyAmortizationLoans = p.mortgageLoans.filter((l) => l.loanKind === "amortization")

  // Intérêts hypothécaires
  const trancheRows: Array<MortgageTrancheInput> = []
  let totalDebt = 0
  let weightedSum = 0

  const mortgageLoansView: PropertyMortgageView[] = []

  for (const loan of mortgageLoans) {
    const principalLine = decimalToNumber(loan.principalTotal)
    const lineRate = decimalToNumber(loan.amortizationRatePct)
    const tranches = loan.tranches.map<PropertyTrancheView>((t) => ({
      id: t.id,
      name: t.name,
      principal: decimalToNumber(t.principal),
      ratePct: decimalToNumber(t.ratePct),
      rateType: rateType(t.rateType),
      startDate: t.startDate,
      endDate: t.endDate,
    }))

    const loanDebt = tranches.length > 0 ? tranches.reduce((s, t) => s + t.principal, 0) : principalLine
    const loanWeighted = tranches.length > 0
      ? tranches.reduce((s, t) => s + t.principal * t.ratePct, 0)
      : principalLine * lineRate

    totalDebt += loanDebt
    weightedSum += loanWeighted

    if (tranches.length > 0) {
      for (const t of tranches) {
        trancheRows.push({ principal: t.principal, ratePct: t.ratePct, rateType: t.rateType })
      }
    } else if (principalLine > 0 && lineRate >= 0) {
      trancheRows.push({ principal: principalLine, ratePct: lineRate, rateType: "fixed" })
    }

    mortgageLoansView.push({
      loanId: loan.id,
      label: loan.label,
      loanKind: "mortgage",
      amortizationMode: amortizationMode(loan.amortizationMode),
      totalDebt: loanDebt,
      weightedRatePct: loanDebt > 0 ? loanWeighted / loanDebt : lineRate,
      isVirtual: tranches.length === 0,
      tranches,
      principalTotal: principalLine,
      ratePct: lineRate,
    })
  }

  // Vue par défaut : premier prêt hypothécaire (pour compat avec ancien code).
  // Si plusieurs prêts, on l'enrichit avec la liste consolidée.
  let primaryMortgageView: PropertyMortgageView | null = mortgageLoansView[0] ?? null
  if (primaryMortgageView && mortgageLoans.length > 1) {
    const allTranches: PropertyTrancheView[] = mortgageLoansView.flatMap((l) => l.tranches)
    primaryMortgageView = {
      ...primaryMortgageView,
      label: "Dette hypothécaire (toutes lignes)",
      totalDebt,
      weightedRatePct: totalDebt > 0 ? weightedSum / totalDebt : 0,
      tranches: allTranches,
      isVirtual: false,
    }
  }

  // Ajoute aussi les lignes legacy d'amortissement à la vue détaillée
  // pour qu'elles soient visibles et supprimables depuis la nouvelle UI.
  for (const loan of legacyAmortizationLoans) {
    const principalLine = decimalToNumber(loan.principalTotal)
    const lineRate = decimalToNumber(loan.amortizationRatePct)
    const tranches = loan.tranches.map<PropertyTrancheView>((t) => ({
      id: t.id,
      name: t.name,
      principal: decimalToNumber(t.principal),
      ratePct: decimalToNumber(t.ratePct),
      rateType: rateType(t.rateType),
      startDate: t.startDate,
      endDate: t.endDate,
    }))
    const loanDebt = tranches.length > 0 ? tranches.reduce((s, t) => s + t.principal, 0) : principalLine
    const loanWeighted = tranches.length > 0
      ? tranches.reduce((s, t) => s + t.principal * t.ratePct, 0)
      : principalLine * lineRate
    mortgageLoansView.push({
      loanId: loan.id,
      label: loan.label,
      loanKind: "amortization",
      amortizationMode: amortizationMode(loan.amortizationMode),
      totalDebt: loanDebt,
      weightedRatePct: loanDebt > 0 ? loanWeighted / loanDebt : lineRate,
      isVirtual: tranches.length === 0,
      tranches,
      principalTotal: principalLine,
      ratePct: lineRate,
    })
  }

  const weightedRatePct = totalDebt > 0 ? weightedSum / totalDebt : 0
  const annualInterest = (totalDebt * weightedRatePct) / 100
  const monthlyInterest = annualInterest / 12

  // Amortissement : si une ou plusieurs lignes « legacy » existent, on les utilise
  // exclusivement (ancien modèle = un prêt par taux d'amortissement). Sinon, on
  // applique le taux d'amortissement du bien à la dette hypothécaire totale
  // (modèle simplifié : dette × taux % / 100 = amortissement annuel).
  const propertyAmortRate = decimalToNumber(p.amortizationRatePct)
  const propertyAmortMode = amortizationMode(p.amortizationMode)

  let annualAmortization: number
  let effectiveAmortRate = propertyAmortRate
  let effectiveAmortMode = propertyAmortMode

  if (legacyAmortizationLoans.length > 0) {
    // Modèle legacy : sommer chaque ligne d'amortissement.
    annualAmortization = 0
    let legacyPrincipal = 0
    let legacyWeighted = 0
    for (const lg of legacyAmortizationLoans) {
      const lgPrincipal = lg.tranches.length > 0
        ? lg.tranches.reduce((s, t) => s + decimalToNumber(t.principal), 0)
        : decimalToNumber(lg.principalTotal)
      const lgRate = lg.tranches.length > 0
        ? lg.tranches.reduce((s, t) => s + decimalToNumber(t.principal) * decimalToNumber(t.ratePct), 0) /
          Math.max(1, lg.tranches.reduce((s, t) => s + decimalToNumber(t.principal), 0))
        : decimalToNumber(lg.amortizationRatePct)
      annualAmortization += (lgPrincipal * lgRate) / 100
      legacyPrincipal += lgPrincipal
      legacyWeighted += lgPrincipal * lgRate
    }
    // Taux affiché = moyenne pondérée des lignes legacy.
    effectiveAmortRate = legacyPrincipal > 0 ? legacyWeighted / legacyPrincipal : propertyAmortRate
    effectiveAmortMode = amortizationMode(legacyAmortizationLoans[0]?.amortizationMode ?? "direct")
  } else {
    annualAmortization = (totalDebt * propertyAmortRate) / 100
  }

  const monthlyAmortization = annualAmortization / 12

  const monthlyExtraCharges = p.charges.reduce(
    (sum, c) => sum + toMonthlyAmount(decimalToNumber(c.amount), freq(c.frequency)),
    0
  )

  const monthlyMortgageCost = monthlyInterest + monthlyAmortization
  const monthlyTotalCost = monthlyMortgageCost + monthlyExtraCharges

  return {
    finance: {
      totalDebt,
      weightedRatePct,
      annualInterest,
      monthlyInterest,
      amortizationRatePct: effectiveAmortRate,
      amortizationMode: effectiveAmortMode,
      annualAmortization,
      monthlyAmortization,
      monthlyExtraCharges,
      monthlyMortgageCost,
      monthlyTotalCost,
    },
    mortgage: primaryMortgageView,
    mortgageLoansView,
  }
}

export function buildPropertyView(p: PrismaPropertyLike): PropertyView {
  const { finance, mortgage, mortgageLoansView } = computePropertyFinance(p)
  const purchase = decimalToNullable(p.purchaseValueChf)
  const valuation = decimalToNullable(p.valuationChf)
  const capitalGainChf = purchase != null && valuation != null ? valuation - purchase : null
  const capitalGainPct =
    purchase != null && purchase > 0 && capitalGainChf != null ? (capitalGainChf * 100) / purchase : null

  const charges: PropertyChargeView[] = p.charges.map((c) => ({
    id: c.id,
    label: c.label,
    chargeType: c.chargeType,
    amount: decimalToNumber(c.amount),
    frequency: freq(c.frequency),
    monthlyEquivalent: toMonthlyAmount(decimalToNumber(c.amount), freq(c.frequency)),
  }))

  const leases: PropertyLeaseView[] = p.leases.map((l) => {
    const rent = decimalToNumber(l.rentMonthly)
    const ch = decimalToNumber(l.chargesMonthly)
    return {
      id: l.id,
      label: l.label,
      tenantName: l.tenantName,
      isRented: l.isRented,
      rentMonthly: rent,
      chargesMonthly: ch,
      startDate: l.startDate,
      endDate: l.endDate,
      monthlyTotal: rent + ch,
    }
  })

  const investmentKind: InvestmentKind = p.investmentKind === "primary_residence" ? "primary_residence" : "rental"
  const primary = isPrimaryResidence(investmentKind)
  const monthlyRentalIncome = primary
    ? 0
    : leases.filter((l) => l.isRented).reduce((s, l) => s + l.monthlyTotal, 0)

  return {
    id: p.id,
    name: p.name,
    address: p.address,
    propertyType: p.propertyType,
    investmentKind,
    isPrimaryResidence: primary,
    purchaseValueChf: purchase,
    purchaseDate: p.purchaseDate,
    valuationChf: valuation,
    capitalGainChf,
    capitalGainPct,
    mortgage,
    mortgageLoans: mortgageLoansView,
    charges,
    leases,
    finance,
    monthlyRentalIncome,
    monthlyNetCashflow: monthlyRentalIncome - finance.monthlyTotalCost,
  }
}

export function buildPortfolioSummary(views: PropertyView[]): PortfolioSummary {
  let monthlyTotalCost = 0
  let monthlyMortgageInterest = 0
  let monthlyMortgageAmortization = 0
  let monthlyExtraCharges = 0
  let monthlyRentalIncome = 0
  let totalDebt = 0
  let totalValuation = 0
  let totalPurchaseValue = 0
  let allValuesPresent = true
  let rentalCount = 0
  let primaryCount = 0

  for (const v of views) {
    monthlyTotalCost += v.finance.monthlyTotalCost
    monthlyMortgageInterest += v.finance.monthlyInterest
    monthlyMortgageAmortization += v.finance.monthlyAmortization
    monthlyExtraCharges += v.finance.monthlyExtraCharges
    monthlyRentalIncome += v.monthlyRentalIncome
    totalDebt += v.finance.totalDebt
    totalValuation += v.valuationChf ?? 0
    totalPurchaseValue += v.purchaseValueChf ?? 0
    if (v.purchaseValueChf == null || v.valuationChf == null) allValuesPresent = false
    if (v.isPrimaryResidence) primaryCount += 1
    else rentalCount += 1
  }

  const monthlyNetCashflow = monthlyRentalIncome - monthlyTotalCost

  return {
    propertyCount: views.length,
    rentalCount,
    primaryCount,
    monthlyTotalCost,
    monthlyMortgageInterest,
    monthlyMortgageAmortization,
    monthlyExtraCharges,
    monthlyRentalIncome,
    monthlyNetCashflow,
    annualTotalCost: monthlyTotalCost * 12,
    annualRentalIncome: monthlyRentalIncome * 12,
    annualNetCashflow: monthlyNetCashflow * 12,
    totalDebt,
    totalValuation,
    totalPurchaseValue,
    totalCapitalGain: allValuesPresent ? totalValuation - totalPurchaseValue : null,
  }
}

export function _internal_computePropertyFinance(p: PrismaPropertyLike) {
  return computePropertyFinance(p)
}
