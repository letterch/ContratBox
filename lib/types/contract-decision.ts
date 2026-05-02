/** Niveau d’urgence métier (triggers + recommandations) */
export type DecisionUrgencyLevel = "low" | "medium" | "high"

/** Insight décisionnel par contrat (aligné Prisma `ContractDecisionInsight`) */
export type ContractDecisionInsightDto = {
  contractId: string
  /** CHF / an — levier financier principal */
  estimatedImpactChfYear: number
  riskLevel: DecisionUrgencyLevel
  nextAction: string
  canCancelNow: boolean
  /** 0–100 : tri des actions foyer */
  priorityScore: number
  urgencyLevel: DecisionUrgencyLevel
  recommendationKind: "renegotiate" | "cancel" | "switch_provider" | "keep" | "none" | null
}
