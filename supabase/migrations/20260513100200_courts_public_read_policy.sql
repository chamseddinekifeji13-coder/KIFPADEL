-- Sprint 1 P0 — Migration 3/6
-- Permettre à tout utilisateur authentifié de voir les terrains actifs (réservation).
-- La policy existante courts_select_by_membership reste en place (PostgreSQL OR entre permissive policies).
-- Le staff continue à voir aussi les terrains inactifs via la policy membership.

DROP POLICY IF EXISTS "courts_select_public_authenticated" ON public.courts;

CREATE POLICY "courts_select_public_authenticated"
  ON public.courts FOR SELECT
  TO authenticated
  USING (is_active = true);

COMMENT ON POLICY "courts_select_public_authenticated" ON public.courts IS
  'Tout utilisateur authentifié peut voir les terrains actifs (nécessaire pour la réservation).';
