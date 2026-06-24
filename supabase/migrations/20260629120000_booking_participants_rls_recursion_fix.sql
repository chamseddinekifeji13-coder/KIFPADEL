-- Corrige la récursion RLS bookings ↔ booking_participants (Postgres « stack depth limit exceeded »).
-- La policy ne doit pas faire un SELECT sur bookings sous RLS depuis booking_participants.

CREATE OR REPLACE FUNCTION public.booking_club_id(p_booking_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.club_id
  FROM public.bookings b
  WHERE b.id = p_booking_id
  LIMIT 1;
$$;

ALTER FUNCTION public.booking_club_id(uuid) SET row_security TO off;

COMMENT ON FUNCTION public.booking_club_id(uuid) IS
  'Club d''une réservation — lecture sans RLS pour éviter la récursion dans les policies booking_participants.';

GRANT EXECUTE ON FUNCTION public.booking_club_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.booking_club_id(uuid) TO service_role;

DROP POLICY IF EXISTS "booking_participants_select_own_or_staff" ON public.booking_participants;
CREATE POLICY "booking_participants_select_own_or_staff"
  ON public.booking_participants FOR SELECT
  USING (
    player_id = auth.uid()
    OR public.has_club_role(
      public.booking_club_id(booking_id),
      ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
    )
  );

DROP POLICY IF EXISTS "booking_participants_update_staff" ON public.booking_participants;
CREATE POLICY "booking_participants_update_staff"
  ON public.booking_participants FOR UPDATE
  USING (
    public.has_club_role(
      public.booking_club_id(booking_id),
      ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
    )
  );

-- Joueurs connectés : lire les créneaux actifs d'un club (grille disponibilité).
DROP POLICY IF EXISTS "bookings_select_club_availability" ON public.bookings;
CREATE POLICY "bookings_select_club_availability"
  ON public.bookings FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND status::text NOT IN ('cancelled')
    AND EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = club_id
        AND c.is_active = true
    )
  );

COMMENT ON POLICY "bookings_select_club_availability" ON public.bookings IS
  'Grille créneaux : tout joueur connecté voit les réservations des clubs actifs (horaires / places).';
