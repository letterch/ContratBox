-- Simplification gestion immobilière : prix d'achat, taux d'amortissement par bien, dates de bail.

ALTER TABLE "RealEstateProperty"
  ADD COLUMN IF NOT EXISTS "purchaseValueChf" DECIMAL(14,2);

ALTER TABLE "RealEstateProperty"
  ADD COLUMN IF NOT EXISTS "purchaseDate" DATE;

ALTER TABLE "RealEstateProperty"
  ADD COLUMN IF NOT EXISTS "amortizationRatePct" DECIMAL(6,4) NOT NULL DEFAULT 1.25;

ALTER TABLE "RealEstateProperty"
  ADD COLUMN IF NOT EXISTS "amortizationMode" TEXT NOT NULL DEFAULT 'direct';

ALTER TABLE "LeaseUnit"
  ADD COLUMN IF NOT EXISTS "startDate" DATE;

ALTER TABLE "LeaseUnit"
  ADD COLUMN IF NOT EXISTS "endDate" DATE;
