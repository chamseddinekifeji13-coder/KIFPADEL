# Kifpadel

Application SaaS multi-clubs de padel en PWA, mobile-first, avec `Next.js App Router`, `TypeScript`, `Tailwind`, `Supabase` et déploiement `Vercel`.

## Vision produit MVP

- Joueur-first: trouver une partie, chercher des joueurs, réserver un terrain.
- Club en secondaire UX: gestion des terrains, créneaux, matchs ouverts et incidents.
- Profil joueur découpé en 3 axes indépendants:
  - `sport_rating` (Elo simplifié 2v2 + ligues Bronze/Silver/Gold/Platinum)
  - `trust_score` (fiabilité, sanctions progressives)
  - `verification_level` (niveaux 1/2/3)

## Architecture

- `src/app`: UI + routing App Router.
- `src/modules`: couche application (services/cas d’usage).
- `src/domain`: types métier et règles pures.
- `src/lib`: accès infra (Supabase, sécurité, env).
- `supabase/migrations`: schéma SQL et RLS multi-tenant.

## Routes principales

- Joueur:
  - `/:locale`
  - `/:locale/play-now`
  - `/:locale/find-players`
  - `/:locale/book`
  - `/:locale/matches/:matchId`
  - `/:locale/profile`
  - `/:locale/member-card`
- Club:
  - `/:locale/club/dashboard`
  - `/:locale/club/courts`
  - `/:locale/club/slots`
  - `/:locale/club/open-matches`
  - `/:locale/club/incidents`

## i18n

- Locales: `fr` (par défaut), `en`.
- Dictionnaires JSON: `src/i18n/locales/{fr,en}`.
- Toutes les pages UI utilisent les dictionnaires pour éviter les textes hardcodés.

## PWA

- Manifest: `public/manifest.webmanifest`
- Service worker: `public/sw.js`
- Enregistrement: `src/modules/pwa/register-sw.tsx`

## Rôles utilisateur

- `player`
- `club_staff`
- `club_manager`
- `platform_admin`

## Conventions de nommage

- fichiers: `kebab-case`
- composants / types: `PascalCase`
- fonctions: `camelCase`
- tables SQL: `snake_case` pluriel
- FK SQL: `club_id`, `player_id`, `match_id`

## Lancement local

1. Copier les variables depuis `.env.example`.
2. Installer les dépendances:

```bash
npm install
```

3. Lancer l’app:

```bash
npm run dev
```

4. Vérifier la qualité:

```bash
npm run lint
npm run typecheck
npm run test
```
