# Super Admin V1 (KIFPADEL)

## Rôles

| Mécanisme | Effet |
|-----------|--------|
| `profiles.global_role = 'super_admin'` | **Seule** source de vérité pour l’accès `/admin` et les politiques « plateforme » (PII globale, sponsors, audit, suspension club/joueur). |
| `public.is_super_admin()` (SQL) | Fonction `SECURITY DEFINER` alignée sur la colonne ci-dessus — utilisée par les politiques RLS. |
| `club_memberships.role = 'platform_admin'` | Conservé via `is_platform_admin()` pour **héritage** (ex. lecture clubs inactifs). **Ne remplace pas** un super admin et **n’ouvre pas** la liste globale des profils. |

## Garde applicative

- `src/app/[locale]/(admin)/admin/layout.tsx` exige `supabase.rpc('is_super_admin') === true`.

## PII

- L’accès liste globale `profiles` est réservé aux super admins ; le staff club voit uniquement roster / créateurs de réservations sur ses clubs (`policies dédiées` dans la migration `20260510183000_super_admin_rls_align.sql`).

## Confiance (`trust_events`)

- Écritures via `apply_trust_adjustment()` (`SECURITY DEFINER`) uniquement ; la logique d’autorisation est dans la fonction SQL.

## `audit_log`

Écrit pour : `SUPER_ADMIN_GRANTED`, mutations sponsors, suspension/réactivation club & joueur (voir modules listés dans le dernier changelog / PR).

## Hors périmètre V1

- Campagnes, e-mail transactionnel/marketing, segmentation.
- Récompenses promotionnelles tournois (hors liste existante joueur).

## Changement de comportement (attention)

- **`member_cards`** : l’UPSERT passait par une policy `platform_admin` (membership). Désormais, seules les sessions **`super_admin`** peuvent modifier ces lignes. Migrer les comptes opérateurs ou ajuster les policies si vous avez encore besoin d’un rôle intermédiaire.