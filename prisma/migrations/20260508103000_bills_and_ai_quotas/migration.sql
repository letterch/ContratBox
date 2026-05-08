-- Module factures mensuelles + suivi quota IA + admin overrides
-- + adresse email entrante par utilisateur (Phase 2 prêt à brancher).

-- 1) User : champs admin / quotas / inbound email
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inboundEmailToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aiQuotaOverride" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "extraModules" TEXT[] NOT NULL DEFAULT '{}';

-- Unique sur token email entrant (NULL autorisé)
CREATE UNIQUE INDEX IF NOT EXISTS "User_inboundEmailToken_key" ON "User"("inboundEmailToken");

-- 2) AdministrativeItem : lien vers une facture créée
ALTER TABLE "AdministrativeItem" ADD COLUMN IF NOT EXISTS "convertedToBillId" TEXT;
CREATE INDEX IF NOT EXISTS "AdministrativeItem_convertedToBillId_idx" ON "AdministrativeItem"("convertedToBillId");

-- 3) Bill : facture mensuelle
CREATE TABLE IF NOT EXISTS "Bill" (
  "id" TEXT PRIMARY KEY,
  "householdId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "contractId" TEXT,
  "memberId" TEXT,
  "isHouseholdWide" BOOLEAN NOT NULL DEFAULT false,
  "title" TEXT NOT NULL,
  "provider" TEXT,
  "category" TEXT,
  "invoiceNumber" TEXT,
  "reference" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CHF',
  "issueDate" DATE,
  "dueDate" DATE,
  "paidAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "recurrence" TEXT NOT NULL DEFAULT 'one_off',
  "source" TEXT NOT NULL DEFAULT 'manual',
  "notes" TEXT,
  "extractedText" TEXT,
  "extractionConfidence" DECIMAL(5,2),
  "rawExtraction" JSONB,
  "textExtractionMeta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Bill_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE,
  CONSTRAINT "Bill_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Bill_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL,
  CONSTRAINT "Bill_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "Bill_householdId_status_idx" ON "Bill"("householdId", "status");
CREATE INDEX IF NOT EXISTS "Bill_householdId_dueDate_idx" ON "Bill"("householdId", "dueDate");
CREATE INDEX IF NOT EXISTS "Bill_contractId_idx" ON "Bill"("contractId");
CREATE INDEX IF NOT EXISTS "Bill_memberId_idx" ON "Bill"("memberId");

-- 4) BillDocument : pièce jointe scannée
CREATE TABLE IF NOT EXISTS "BillDocument" (
  "id" TEXT PRIMARY KEY,
  "billId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "r2Key" TEXT NOT NULL,
  "r2Bucket" TEXT,
  "extractedText" TEXT,
  "textExtractionMeta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillDocument_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "BillDocument_billId_idx" ON "BillDocument"("billId");

-- 5) AiUsageMonth : compteur mensuel des questions par utilisateur
CREATE TABLE IF NOT EXISTS "AiUsageMonth" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "monthStart" DATE NOT NULL,
  "questionsCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsageMonth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiUsageMonth_userId_monthStart_key" ON "AiUsageMonth"("userId", "monthStart");
CREATE INDEX IF NOT EXISTS "AiUsageMonth_userId_idx" ON "AiUsageMonth"("userId");

-- 6) Reminder : lien vers facture + nouveau type bill_due
ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "billId" TEXT;
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Reminder_billId_status_idx" ON "Reminder"("billId", "status");
