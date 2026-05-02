-- Reminder v2 : ménage, métadonnées, dueDate (ex-triggerAt), contractId optionnel
-- Prérequis : table "Reminder" avec colonne "triggerAt" (schéma ContratBox avant ce sprint).

ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "householdId" TEXT;
UPDATE "Reminder" r SET "householdId" = c."householdId" FROM "Contract" c WHERE r."contractId" = c."id" AND r."householdId" IS NULL;
DELETE FROM "Reminder" WHERE "householdId" IS NULL;
ALTER TABLE "Reminder" ALTER COLUMN "householdId" SET NOT NULL;

ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "propertyId" TEXT;

ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "title" TEXT;
UPDATE "Reminder" SET "title" = COALESCE("type", 'Rappel') WHERE "title" IS NULL;
ALTER TABLE "Reminder" ALTER COLUMN "title" SET NOT NULL;

ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Reminder" RENAME COLUMN "triggerAt" TO "dueDate";

ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "urgencyLevel" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "estimatedImpactChfYear" DECIMAL(12,2);
ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'legacy_upload';
ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT;
UPDATE "Reminder" SET "dedupeKey" = 'legacy:' || "id"::text WHERE "dedupeKey" IS NULL;

UPDATE "Reminder" SET "type" = 'mortgage_expiry' WHERE "type" = 'mortgage_maturity';
UPDATE "Reminder" SET "type" = 'cancellation_deadline' WHERE "type" = 'lease_notice_window';

ALTER TABLE "Reminder" ALTER COLUMN "contractId" DROP NOT NULL;

ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Reminder_householdId_status_dueDate_idx" ON "Reminder"("householdId", "status", "dueDate");
CREATE INDEX IF NOT EXISTS "Reminder_contractId_status_idx" ON "Reminder"("contractId", "status");
CREATE INDEX IF NOT EXISTS "Reminder_dedupeKey_idx" ON "Reminder"("dedupeKey");
