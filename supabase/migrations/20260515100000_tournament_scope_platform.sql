-- Phase A: tournois interclubs / inter-région / plateforme (Super Admin).
-- club_id reste NOT NULL = club hôte (terrains, arbitre RLS matches). Les méta (régions) vont dans scope_metadata.

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS tournament_scope text NOT NULL DEFAULT 'single_club'
    CHECK (tournament_scope IN ('single_club', 'interclub', 'inter_region', 'platform'));

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS scope_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.tournaments.tournament_scope IS
  'single_club = classique club; interclub / inter_region / platform = tournois plateforme (création super admin ou hôte selon policy).';
COMMENT ON COLUMN public.tournaments.scope_metadata IS
  'Ex. { "regions_display": "Tunis–Sfax" } pour affichage; extensions futures (codes région, clubs invités).';

UPDATE public.tournaments SET tournament_scope = 'single_club' WHERE tournament_scope IS NULL;

-- ============ RLS tournaments ============
DROP POLICY IF EXISTS "tournaments_insert_staff" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_insert_super_admin_platform" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_insert_super_admin_scope" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_update_staff" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_delete_staff" ON public.tournaments;

-- Club: uniquement tournois single_club sur son club
CREATE POLICY "tournaments_insert_staff"
  ON public.tournaments FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND tournament_scope = 'single_club'
    AND public.has_club_role(
      club_id,
      ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[]
    )
  );

-- Super admin: tournois étendus (club hôte obligatoire)
CREATE POLICY "tournaments_insert_super_admin_scope"
  ON public.tournaments FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND tournament_scope IN ('interclub', 'inter_region', 'platform')
    AND public.is_super_admin()
  );

CREATE POLICY "tournaments_update_staff"
  ON public.tournaments FOR UPDATE
  USING (
    public.is_super_admin()
    OR public.has_club_role(
      club_id,
      ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[]
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.has_club_role(
      club_id,
      ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[]
    )
  );

CREATE POLICY "tournaments_delete_staff"
  ON public.tournaments FOR DELETE
  USING (
    public.is_super_admin()
    OR public.has_club_role(
      club_id,
      ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[]
    )
  );

-- ============ tournament_entries ============
DROP POLICY IF EXISTS "tournament_entries_manage_staff" ON public.tournament_entries;

CREATE POLICY "tournament_entries_manage_staff"
  ON public.tournament_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_entries.tournament_id
        AND (
          public.is_super_admin()
          OR public.has_club_role(
            t.club_id,
            ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[]
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_entries.tournament_id
        AND (
          public.is_super_admin()
          OR public.has_club_role(
            t.club_id,
            ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[]
          )
        )
    )
  );

-- ============ tournament_matches ============
DROP POLICY IF EXISTS "tournament_matches_write_staff" ON public.tournament_matches;

CREATE POLICY "tournament_matches_write_staff"
  ON public.tournament_matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_matches.tournament_id
        AND (
          public.is_super_admin()
          OR public.has_club_role(
            t.club_id,
            ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[]
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_matches.tournament_id
        AND (
          public.is_super_admin()
          OR public.has_club_role(
            t.club_id,
            ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[]
          )
        )
    )
  );
