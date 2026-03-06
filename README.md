# ContratBox

**Tous vos contrats au même endroit.** ContratBox est un gestionnaire de contrats pour ménages suisses : centralisation des contrats, extraction IA, rappels d'échéances et assistant conversationnel.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui
- **PostgreSQL** + Prisma ORM
- **NextAuth v5** (Google + magic link Resend)
- **OpenRouter** (extraction + assistant IA)
- **Resend** (emails transactionnels)
- **Cloudflare R2** (stockage documents)
- **Stripe** (abonnements — à brancher)
- Déploiement : **Railway** (ou Vercel)

## Prérequis

- Node.js 20+
- pnpm
- PostgreSQL (local, Railway, Neon, Supabase)
- Comptes : Google OAuth, Resend, OpenRouter, Cloudflare R2 (optionnel en dev)

## Installation

```bash
# Cloner et entrer dans le repo
cd ContratBox

# Installer les dépendances
pnpm install

# Copier les variables d'environnement
cp .env.example .env
# Éditer .env et remplir au minimum :
# - DATABASE_URL
# - AUTH_SECRET (générer : openssl rand -base64 32)
# - AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET (optionnel)
# - AUTH_RESEND_KEY + EMAIL_FROM (pour magic link)
# - OPENROUTER_API_KEY (pour extraction + chat IA)
# - R2_* (pour stockage documents, optionnel en dev)
```

## Base de données

```bash
# Créer les tables (schéma Prisma)
pnpm db:push

# Ou en migrations
pnpm db:migrate

# Ouvrir Prisma Studio (optionnel)
pnpm db:studio
```

## Lancer en local

```bash
pnpm dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

- **Landing** : `/`
- **Connexion** : `/login` (Google ou lien magique)
- **Onboarding** : après première connexion, nom du ménage
- **Tableau de bord** : `/dashboard`
- **Contrats** : `/contracts`, `/contracts/[id]`
- **Ajouter un contrat** : `/upload` (PDF/image → OCR + extraction IA → vérification → enregistrement)
- **Assistant IA** : `/ai`
- **Paramètres** : `/settings`
- **Admin** : `/admin` (réservé aux utilisateurs avec `role: admin`)

## Structure

- `app/` — Routes Next.js (landing, auth, app authentifiée, API)
- `components/` — UI (landing, dashboard, formulaires, shadcn)
- `lib/` — Utilitaires, auth, DB, constantes
- `lib/services/` — Logique métier (household, contract, storage, ocr, extraction)
- `app/actions/` — Server actions (onboarding, contrats, dashboard)
- `prisma/` — Schéma et migrations

## Freemium

- **Gratuit** : 3 contrats maximum par ménage.
- **Payant** : illimité (Stripe à connecter).

## Déploiement (Railway)

1. Créer un projet Railway, ajouter un service PostgreSQL.
2. Variables d'environnement : copier depuis `.env.example`, adapter `DATABASE_URL`, `AUTH_URL` (ou `NEXTAUTH_URL`), etc.
3. Build : `pnpm build` (ou équivalent Railway).
4. Démarrer : `pnpm start` (applique automatiquement `prisma db push`).

Si ta base est vide, tu peux aussi exécuter une fois en tâche admin :

```bash
pnpm db:push
```

## Licence

Propriétaire — ContratBox.
