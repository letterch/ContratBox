import assert from "node:assert/strict"
import { buildPortfolioSummary, buildPropertyView } from "@/lib/services/real-estate/portfolio"

/**
 * Tests unitaires manuels (exclus de vitest, comme les autres tests real-estate).
 * Vérifie les calculs simplifiés : intérêts par tranche, amortissement par bien,
 * agrégation portfolio.
 */
export function runPortfolioUnitTests() {
  // Cas 1 : 1 bien rendement, 2 tranches, charges PPE, 1 lot loué.
  const view = buildPropertyView({
    id: "p1",
    name: "Orbe",
    address: "Rue Centrale 1",
    propertyType: "apartment",
    investmentKind: "rental",
    purchaseValueChf: 850_000,
    purchaseDate: null,
    valuationChf: 920_000,
    amortizationRatePct: 1.25,
    amortizationMode: "direct",
    mortgageLoans: [
      {
        id: "l1",
        label: "Dette",
        loanKind: "mortgage",
        amortizationMode: "direct",
        principalTotal: 0,
        amortizationRatePct: 0,
        tranches: [
          { id: "t1", name: "T1", principal: 500_000, ratePct: 1.8, rateType: "fixed", startDate: null, endDate: null },
          { id: "t2", name: "T2", principal: 200_000, ratePct: 2.2, rateType: "saron", startDate: null, endDate: null },
        ],
      },
    ],
    charges: [
      { id: "c1", label: "PPE", chargeType: "ppe", amount: 350, frequency: "monthly" },
      { id: "c2", label: "Bâtiment", chargeType: "insurance", amount: 1200, frequency: "annual" },
    ],
    leases: [
      {
        id: "le1",
        label: "Lot 1",
        tenantName: "Dupont",
        isRented: true,
        rentMonthly: 1850,
        chargesMonthly: 250,
        startDate: null,
        endDate: null,
      },
    ],
  })

  // Intérêts : (500000*1.8 + 200000*2.2) / 100 / 12 = (9000+4400)/12 = 1116.66...
  assert.ok(Math.abs(view.finance.monthlyInterest - 1116.6667) < 0.01, `interest=${view.finance.monthlyInterest}`)
  // Dette totale : 700000
  assert.equal(view.finance.totalDebt, 700_000)
  // Taux moyen pondéré : (500000*1.8 + 200000*2.2) / 700000 = 13400/700000 *100 ≈ 1.9143
  assert.ok(Math.abs(view.finance.weightedRatePct - 13400 / 7000) < 0.001, `weightedRate=${view.finance.weightedRatePct}`)
  // Amortissement : 700000 * 1.25 / 100 / 12 = 729.17
  assert.ok(
    Math.abs(view.finance.monthlyAmortization - (700_000 * 1.25) / 100 / 12) < 0.01,
    `amort=${view.finance.monthlyAmortization}`
  )
  // Charges PPE : 350 + 1200/12 = 350 + 100 = 450
  assert.equal(view.finance.monthlyExtraCharges, 450)
  // Total : intérêts + amort + charges
  const expectedTotal = view.finance.monthlyInterest + view.finance.monthlyAmortization + 450
  assert.ok(Math.abs(view.finance.monthlyTotalCost - expectedTotal) < 0.01)
  // Loyer mensuel : 1850 + 250 = 2100
  assert.equal(view.monthlyRentalIncome, 2100)
  // Plus-value
  assert.equal(view.capitalGainChf, 70_000)

  // Cas 2 : domicile principal — pas de loyers comptés
  const home = buildPropertyView({
    id: "p2",
    name: "Domicile",
    address: null,
    propertyType: "house",
    investmentKind: "primary_residence",
    purchaseValueChf: null,
    purchaseDate: null,
    valuationChf: null,
    amortizationRatePct: 1.25,
    amortizationMode: "direct",
    mortgageLoans: [
      {
        id: "l2",
        label: "Dette",
        loanKind: "mortgage",
        amortizationMode: "direct",
        principalTotal: 600_000,
        amortizationRatePct: 1.5,
        tranches: [],
      },
    ],
    charges: [],
    leases: [
      { id: "le2", label: "Lot", tenantName: null, isRented: true, rentMonthly: 2000, chargesMonthly: 0, startDate: null, endDate: null },
    ],
  })
  // Intérêts via principalTotal × ratePct ligne
  assert.ok(Math.abs(home.finance.monthlyInterest - (600_000 * 1.5) / 100 / 12) < 0.01)
  // Pas de loyers (domicile principal)
  assert.equal(home.monthlyRentalIncome, 0)
  assert.equal(home.isPrimaryResidence, true)

  // Synthèse portfolio
  const summary = buildPortfolioSummary([view, home])
  assert.equal(summary.propertyCount, 2)
  assert.equal(summary.rentalCount, 1)
  assert.equal(summary.primaryCount, 1)
  assert.equal(summary.monthlyRentalIncome, 2100)
  assert.ok(Math.abs(summary.monthlyTotalCost - (view.finance.monthlyTotalCost + home.finance.monthlyTotalCost)) < 0.01)
  // Plus-value globale = null (home n'a pas valeurs)
  assert.equal(summary.totalCapitalGain, null)
}

runPortfolioUnitTests()
