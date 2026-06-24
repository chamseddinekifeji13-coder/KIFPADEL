-- Corrige « stack depth limit exceeded » à l'insertion de match_results
-- (policy WITH CHECK qui relit matches + match_participants sous RLS).

CREATE OR REPLACE FUNCTION public.user_can_insert_match_result(p_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = p_match_id
      AND (
        m.created_by = auth.uid()
        OR (
          m.club_id IS NOT NULL
          AND public.has_club_role(
            m.club_id,
            ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
          )
        )
        OR EXISTS (
          SELECT 1
          FROM public.match_participants mp
          WHERE mp.match_id = m.id
            AND mp.player_id = auth.uid()
            AND mp.status::text IN ('confirmed', 'completed', 'pending')
        )
      )
  );
$$;

ALTER FUNCTION public.user_can_insert_match_result(uuid) SET row_security TO off;

COMMENT ON FUNCTION public.user_can_insert_match_result(uuid) IS
  'Droit d''insérer un résultat — lecture matches/participants sans récursion RLS.';

GRANT EXECUTE ON FUNCTION public.user_can_insert_match_result(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_insert_match_result(uuid) TO service_role;

DROP POLICY IF EXISTS "match_results_insert_staff_or_creator" ON public.match_results;
CREATE POLICY "match_results_insert_staff_or_creator"
  ON public.match_results FOR INSERT
  WITH CHECK (
    validated_by = auth.uid()
    AND public.user_can_insert_match_result(match_id)
  );

-- Trigger post-insert : ELO, stats, confiance — doit lire participants/profiles sans RLS.
ALTER FUNCTION public.process_match_result() SET row_security TO off;

ALTER FUNCTION public.apply_system_trust_delta(uuid, text, integer, uuid) SET row_security TO off;
