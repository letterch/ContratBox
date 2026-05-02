import { z } from "zod"

export const decisionSignalsSchema = z.object({
  renewalDateFound: z.boolean(),
  cancellationDeadlineFound: z.boolean(),
  hiddenRisks: z.array(z.string()).max(24),
  overpricingSignals: z.array(z.string()).max(24),
})

export const contractDecisionAnalysisResponseSchema = z.object({
  estimatedImpactChfYear: z.number().min(0).max(500_000),
  riskLevel: z.enum(["low", "medium", "high"]),
  urgencyLevel: z.enum(["low", "medium", "high"]),
  nextAction: z.string().max(2000),
  canCancelNow: z.boolean(),
  recommendationKind: z.enum(["renegotiate", "cancel", "switch_provider", "none"]),
  signals: decisionSignalsSchema,
})

export type ContractDecisionAnalysisPayload = z.infer<typeof contractDecisionAnalysisResponseSchema>
