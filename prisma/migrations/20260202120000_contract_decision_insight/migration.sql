-- CreateTable
CREATE TABLE "ContractDecisionInsight" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "estimatedImpactChfYear" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "nextAction" TEXT NOT NULL DEFAULT '',
    "canCancelNow" BOOLEAN NOT NULL DEFAULT false,
    "priorityScore" INTEGER NOT NULL DEFAULT 0,
    "urgencyLevel" TEXT NOT NULL DEFAULT 'low',
    "recommendationKind" TEXT,
    "signals" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractDecisionInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractDecisionInsight_contractId_key" ON "ContractDecisionInsight"("contractId");

-- AddForeignKey
ALTER TABLE "ContractDecisionInsight" ADD CONSTRAINT "ContractDecisionInsight_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
