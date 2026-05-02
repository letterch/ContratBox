-- Exemples pour STAGING : forcer des données visibles (triggers / rappels / top actions).
-- Remplace :YOUR_CONTRACT_ID par un id réel de la table "Contract" (Prisma Studio ou SELECT id FROM "Contract" LIMIT 1).

-- Renouvellement dans 30 jours (déclenche contract_renewal + recommandations)
-- UPDATE "Contract"
-- SET "renewalDate" = CURRENT_DATE + 30, "updatedAt" = NOW()
-- WHERE id = ':YOUR_CONTRACT_ID';

-- Fenêtre de résiliation dans 45 jours (déclenche cancellation_deadline si cohérent avec préavis)
-- UPDATE "Contract"
-- SET
--   "renewalDate" = CURRENT_DATE + 120,
--   "cancellationNoticeDays" = 60,
--   "cancellationDeadline" = CURRENT_DATE + 45,
--   "updatedAt" = NOW()
-- WHERE id = ':YOUR_CONTRACT_ID';

-- Hypothèque : tranche qui expire dans 120 jours (rawExtraction.mortgageTranches avec endDate)
-- UPDATE "Contract"
-- SET
--   "category" = 'mortgage',
--   "maturityDate" = CURRENT_DATE + 120,
--   "rawExtraction" = jsonb_set(
--     COALESCE("rawExtraction", '{}'::jsonb),
--     '{mortgageTranches}',
--     '[{"name":"Tranche 1","principal":400000,"rate":2.5,"endDate":"' || to_char(CURRENT_DATE + 120, 'YYYY-MM-DD') || '"}]'::jsonb
--   ),
--   "updatedAt" = NOW()
-- WHERE id = ':YOUR_CONTRACT_ID';
