-- Fusion ContratBox × BudgetFamille : revenus, budget, dépendants, actions NextLetter, R2 attachments IA

-- HouseholdDependent
CREATE TABLE IF NOT EXISTS "HouseholdDependent" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT,
    "birthDate" DATE,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HouseholdDependent_pkey" PRIMARY KEY ("id")
);

-- Income
CREATE TABLE IF NOT EXISTS "Income" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdById" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'family',
    "memberId" TEXT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "frequency" TEXT NOT NULL DEFAULT 'monthly',
    "dayOfMonth" INTEGER,
    "category" TEXT NOT NULL DEFAULT 'salary',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Income_pkey" PRIMARY KEY ("id")
);

-- BudgetEnvelope
CREATE TABLE IF NOT EXISTS "BudgetEnvelope" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'family',
    "memberId" TEXT,
    "dependentId" TEXT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "category" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BudgetEnvelope_pkey" PRIMARY KEY ("id")
);

-- NextLetterActionLog
CREATE TABLE IF NOT EXISTS "NextLetterActionLog" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "billId" TEXT,
    "contractId" TEXT,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "letterBody" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NextLetterActionLog_pkey" PRIMARY KEY ("id")
);

-- BillPayment
CREATE TABLE IF NOT EXISTS "BillPayment" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BillPayment_pkey" PRIMARY KEY ("id")
);

-- Bill.dependentId
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "dependentId" TEXT;

-- AiAssistantAttachment R2 fields
ALTER TABLE "AiAssistantAttachment" ADD COLUMN IF NOT EXISTS "sizeBytes" INTEGER;
ALTER TABLE "AiAssistantAttachment" ADD COLUMN IF NOT EXISTS "r2Key" TEXT;
ALTER TABLE "AiAssistantAttachment" ADD COLUMN IF NOT EXISTS "r2Bucket" TEXT;

-- Indexes & uniques
CREATE UNIQUE INDEX IF NOT EXISTS "HouseholdDependent_householdId_type_name_key" ON "HouseholdDependent"("householdId", "type", "name");
CREATE INDEX IF NOT EXISTS "HouseholdDependent_householdId_isActive_idx" ON "HouseholdDependent"("householdId", "isActive");

CREATE INDEX IF NOT EXISTS "Income_householdId_isActive_idx" ON "Income"("householdId", "isActive");
CREATE INDEX IF NOT EXISTS "Income_memberId_idx" ON "Income"("memberId");

CREATE UNIQUE INDEX IF NOT EXISTS "BudgetEnvelope_householdId_name_month_year_scope_memberId_dependentId_key" ON "BudgetEnvelope"("householdId", "name", "month", "year", "scope", "memberId", "dependentId");
CREATE INDEX IF NOT EXISTS "BudgetEnvelope_householdId_year_month_idx" ON "BudgetEnvelope"("householdId", "year", "month");

CREATE INDEX IF NOT EXISTS "NextLetterActionLog_householdId_status_idx" ON "NextLetterActionLog"("householdId", "status");
CREATE INDEX IF NOT EXISTS "NextLetterActionLog_userId_createdAt_idx" ON "NextLetterActionLog"("userId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "BillPayment_billId_month_year_key" ON "BillPayment"("billId", "month", "year");
CREATE INDEX IF NOT EXISTS "BillPayment_billId_status_idx" ON "BillPayment"("billId", "status");

CREATE INDEX IF NOT EXISTS "Bill_dependentId_idx" ON "Bill"("dependentId");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "HouseholdDependent" ADD CONSTRAINT "HouseholdDependent_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Income" ADD CONSTRAINT "Income_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Income" ADD CONSTRAINT "Income_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Income" ADD CONSTRAINT "Income_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BudgetEnvelope" ADD CONSTRAINT "BudgetEnvelope_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BudgetEnvelope" ADD CONSTRAINT "BudgetEnvelope_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BudgetEnvelope" ADD CONSTRAINT "BudgetEnvelope_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "HouseholdDependent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "NextLetterActionLog" ADD CONSTRAINT "NextLetterActionLog_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "NextLetterActionLog" ADD CONSTRAINT "NextLetterActionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "NextLetterActionLog" ADD CONSTRAINT "NextLetterActionLog_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "NextLetterActionLog" ADD CONSTRAINT "NextLetterActionLog_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BillPayment" ADD CONSTRAINT "BillPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Bill" ADD CONSTRAINT "Bill_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "HouseholdDependent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
