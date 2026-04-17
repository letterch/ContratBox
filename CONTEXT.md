# ContratBox Context (Architecture Decisions)

## Current Product Direction

ContratBox evolue vers un **Household Admin OS** modulaire.
Le socle de controle d'acces est centralise autour de:

- `lib/config/plans.ts` (plans, quotas, features, mapping Stripe)
- `lib/services/entitlements.ts` (regles d'eligibilite)
- `lib/services/access-context.ts` (source unique de verite runtime)
- `lib/services/navigation.ts` (menus derives des droits)

## Decisions to Keep

1. **No risky refactor of `Contract`/`Document`**
   - `Document.contractId` reste obligatoire.
   - Les documents admin hors contrat vivent dans `AdministrativeItem`.

2. **Human-in-the-loop for Inbox -> Contract**
   - Aucune conversion automatique finale.
   - Reutilisation du wizard `upload` + validation humaine.

3. **Stripe webhook remains source of truth**
   - Checkout/portal initient l'intention.
   - L'acces produit est derive des donnees synchronisees par webhook.

4. **Reminder domain remains central**
   - `Reminder` garde sa vocation contractuelle.
   - Les echeances tasks/inbox/real-estate sont agreges dans une timeline, sans dupliquer un modele concurrent.

## E2E Paths (Expected)

1. Signup / login -> onboarding
2. Upload contract -> review -> `saveContractFromUpload`
3. Inbox upload -> extraction -> create task
4. Inbox item -> open upload prefilled -> review -> contract create + trace
5. Billing choose plan -> checkout -> webhook -> module access refresh

## Inbox -> Contract Traceability

- `AdministrativeItem.convertedToContractId`
- `AdministrativeItem.convertedAt`
- `AdministrativeItem.status` bascule sur `archived` apres conversion validee

## Reminder Timeline Strategy

`lib/services/reminder-timeline.ts` consolide:

- reminders contractuels (`Reminder`)
- tasks ouvertes avec due date
- inbox items actifs avec due date
- echeances real-estate derivees des contrats

Avec deduplication legere par source/titre/jour.

## Future Delegation / Family (Preparation Only)

### Goal

Permettre plusieurs households accessibles par un meme user, avec roles d'acces.

### Minimal future model proposal

- `HouseholdAccess`
  - `userId`
  - `householdId`
  - `accessRole` (`owner` | `manager` | `helper` | `viewer`)
  - `invitedByUserId`
  - `acceptedAt`
  - `revokedAt`

### Why separate from HouseholdMember

- `HouseholdMember` decrit des personnes du foyer (metier).
- `HouseholdAccess` decrit des **droits applicatifs** (RBAC).
- Evite de melanger profil familial et permissions.

### Integration path

1. Ajouter `HouseholdAccess` (sans casser owner actuel).
2. Faire evoluer `AccessContext` pour charger `activeHouseholdId`.
3. Brancher checks sur `accessRole`.
4. Journaliser mutations sensibles dans `AuditLog`.

## Technical Debt (Known)

- TypeScript global contient encore des erreurs historiques hors perimetre phase (auth typings, `pdf-parse`, etc.).
- Les plans sont en code (volontaire), pas encore administrables depuis UI.

