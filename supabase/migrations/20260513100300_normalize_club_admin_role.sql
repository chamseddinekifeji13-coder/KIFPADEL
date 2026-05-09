-- Sprint 1 P0 — Migration 4/6
-- Normalize club_admin role across ALL RLS policies.
-- club_admin is the role assigned at club creation (onboarding via create-club.ts).
-- Currently missing from most policy arrays — only courts_manage_by_staff and trust_events_select_scoped had it.

-- ============ CLUBS ============
DROP POLICY IF EXISTS "clubs_select_by_membership" ON public.clubs;
CREATE POLICY "clubs_select_by_membership"
  ON public.clubs FOR SELECT
  USING (
    public.has_club_role(id, ARRAY['player','club_staff','club_manager','club_admin','platform_admin']::text[])
  );

DROP POLICY IF EXISTS "clubs_update_staff" ON public.clubs;
CREATE POLICY "clubs_update_staff"
  ON public.clubs FOR UPDATE
  USING (
    public.has_club_role(id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[])
  )
  WITH CHECK (
    public.has_club_role(id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[])
  );

-- ============ COURTS ============
DROP POLICY IF EXISTS "courts_select_by_membership" ON public.courts;
CREATE POLICY "courts_select_by_membership"
  ON public.courts FOR SELECT
  USING (
    public.has_club_role(club_id, ARRAY['player','club_staff','club_manager','club_admin','platform_admin']::text[])
    OR public.is_platform_admin()
  );
-- courts_manage_by_staff already includes club_admin (20260508120000) — no change needed.

-- ============ BOOKINGS ============
DROP POLICY IF EXISTS "bookings_select_owner_or_staff" ON public.bookings;
CREATE POLICY "bookings_select_owner_or_staff"
  ON public.bookings FOR SELECT
  USING (
    created_by = auth.uid()
    OR public.has_club_role(club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[])
  );

DROP POLICY IF EXISTS "bookings_update_owner_or_staff" ON public.bookings;
CREATE POLICY "bookings_update_owner_or_staff"
  ON public.bookings FOR UPDATE
  USING (
    created_by = auth.uid()
    OR public.has_club_role(club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[])
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.has_club_role(club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[])
  );

-- ============ MATCHES ============
DROP POLICY IF EXISTS "matches_read_open_or_member" ON public.matches;
CREATE POLICY "matches_read_open_or_member"
  ON public.matches FOR SELECT
  USING (
    status = 'open'
    OR created_by = auth.uid()
    OR (club_id IS NOT NULL AND public.has_club_role(club_id, ARRAY['player','club_staff','club_manager','club_admin','platform_admin']::text[]))
  );

DROP POLICY IF EXISTS "matches_update_owner_or_staff" ON public.matches;
CREATE POLICY "matches_update_owner_or_staff"
  ON public.matches FOR UPDATE
  USING (
    created_by = auth.uid()
    OR (club_id IS NOT NULL AND public.has_club_role(club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[]))
  )
  WITH CHECK (
    created_by = auth.uid()
    OR (club_id IS NOT NULL AND public.has_club_role(club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[]))
  );

-- ============ MATCH_PARTICIPANTS ============
DROP POLICY IF EXISTS "match_participants_select_match_members" ON public.match_participants;
CREATE POLICY "match_participants_select_match_members"
  ON public.match_participants FOR SELECT
  USING (
    player_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.status = 'open'
    )
    OR EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND (
          m.created_by = auth.uid()
          OR (m.club_id IS NOT NULL AND public.has_club_role(m.club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[]))
        )
    )
  );

DROP POLICY IF EXISTS "match_participants_insert_club_staff" ON public.match_participants;
CREATE POLICY "match_participants_insert_club_staff"
  ON public.match_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND m.club_id IS NOT NULL
        AND public.has_club_role(m.club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[])
    )
  );

-- ============ MATCH_RESULTS ============
DROP POLICY IF EXISTS "match_results_insert_staff_or_creator" ON public.match_results;
CREATE POLICY "match_results_insert_staff_or_creator"
  ON public.match_results FOR INSERT
  WITH CHECK (
    validated_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND (
          m.created_by = auth.uid()
          OR (m.club_id IS NOT NULL AND public.has_club_role(m.club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[]))
        )
    )
  );

-- ============ INCIDENTS ============
DROP POLICY IF EXISTS "incidents_select_club_staff" ON public.incidents;
CREATE POLICY "incidents_select_club_staff"
  ON public.incidents FOR SELECT
  USING (
    public.has_club_role(club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[])
    OR player_id = auth.uid()
  );

DROP POLICY IF EXISTS "incidents_insert_club_staff" ON public.incidents;
CREATE POLICY "incidents_insert_club_staff"
  ON public.incidents FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.has_club_role(club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[])
  );

-- ============ TOURNAMENTS ============
DROP POLICY IF EXISTS "tournaments_insert_staff" ON public.tournaments;
CREATE POLICY "tournaments_insert_staff"
  ON public.tournaments FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.has_club_role(club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[])
  );

DROP POLICY IF EXISTS "tournaments_update_staff" ON public.tournaments;
CREATE POLICY "tournaments_update_staff"
  ON public.tournaments FOR UPDATE
  USING (public.has_club_role(club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[]))
  WITH CHECK (public.has_club_role(club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[]));

DROP POLICY IF EXISTS "tournaments_delete_staff" ON public.tournaments;
CREATE POLICY "tournaments_delete_staff"
  ON public.tournaments FOR DELETE
  USING (public.has_club_role(club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[]));

-- tournament_entries (subquery via tournaments.club_id)
DROP POLICY IF EXISTS "tournament_entries_manage_staff" ON public.tournament_entries;
CREATE POLICY "tournament_entries_manage_staff"
  ON public.tournament_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_entries.tournament_id
        AND public.has_club_role(t.club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_entries.tournament_id
        AND public.has_club_role(t.club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[])
    )
  );

-- tournament_matches
DROP POLICY IF EXISTS "tournament_matches_write_staff" ON public.tournament_matches;
CREATE POLICY "tournament_matches_write_staff"
  ON public.tournament_matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_matches.tournament_id
        AND public.has_club_role(t.club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_matches.tournament_id
        AND public.has_club_role(t.club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[])
    )
  );
