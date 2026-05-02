import { describe, expect, it } from "vitest"
import { contractDecisionAnalysisResponseSchema } from "@/lib/schemas/contract-decision-analysis"

describe("contractDecisionAnalysisResponseSchema", () => {
  it("valide un payload minimal", () => {
    const parsed = contractDecisionAnalysisResponseSchema.safeParse({
      estimatedImpactChfYear: 400,
      riskLevel: "medium",
      urgencyLevel: "low",
      nextAction: "Vérifier les conditions.",
      canCancelNow: false,
      recommendationKind: "none",
      signals: {
        renewalDateFound: false,
        cancellationDeadlineFound: false,
        hiddenRisks: [],
        overpricingSignals: [],
      },
    })
    expect(parsed.success).toBe(true)
  })

  it("rejette un riskLevel invalide", () => {
    const parsed = contractDecisionAnalysisResponseSchema.safeParse({
      estimatedImpactChfYear: 0,
      riskLevel: "extreme",
      urgencyLevel: "low",
      nextAction: "x",
      canCancelNow: false,
      recommendationKind: "none",
      signals: {
        renewalDateFound: false,
        cancellationDeadlineFound: false,
        hiddenRisks: [],
        overpricingSignals: [],
      },
    })
    expect(parsed.success).toBe(false)
  })
})
