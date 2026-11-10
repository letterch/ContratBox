-- Historique annuel des primes pour courbes d'évolution

CREATE TABLE IF NOT EXISTS "ContractPremiumHistory" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "contractId" TEXT,
    "year" INTEGER NOT NULL,
    "provider" TEXT,
    "category" TEXT,
    "memberId" TEXT,
    "policyNumber" TEXT,
    "monthlyPremium" DECIMAL(12,2) NOT NULL,
    "annualPremium" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContractPremiumHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ContractPremiumHistory_householdId_year_idx" ON "ContractPremiumHistory"("householdId", "year");
CREATE INDEX IF NOT EXISTS "ContractPremiumHistory_householdId_provider_category_year_idx" ON "ContractPremiumHistory"("householdId", "provider", "category", "year");
CREATE INDEX IF NOT EXISTS "ContractPremiumHistory_contractId_year_idx" ON "ContractPremiumHistory"("contractId", "year");

DO $$ BEGIN
  ALTER TABLE "ContractPremiumHistory" ADD CONSTRAINT "ContractPremiumHistory_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ContractPremiumHistory" ADD CONSTRAINT "ContractPremiumHistory_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
