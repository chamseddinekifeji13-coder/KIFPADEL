-- Make clubs RLS use public.has_club_role (SECURITY DEFINER, row_security off) instead of
-- inline SELECT from public.club_memberships, avoiding re-entrant evaluation of club_memberships policies.

DROP POLICY IF EXISTS "clubs_select_by_membership" ON public.clubs;

CREATE POLICY "clubs_select_by_membership"
  ON public.clubs FOR SELECT
  USING (
    public.has_club_role(
      id,
      ARRAY['player', 'club_staff', 'club_manager', 'platform_admin']::text[]
    )
  );

DROP POLICY IF EXISTS "clubs_update_staff" ON public.clubs;

CREATE POLICY "clubs_update_staff"
  ON public.clubs FOR UPDATE
  USING (
    public.has_club_role(
      id,
      ARRAY['club_staff', 'club_manager', 'platform_admin']::text[]
    )
  )
  WITH CHECK (
    public.has_club_role(
      id,
      ARRAY['club_staff', 'club_manager', 'platform_admin']::text[]
    )
  );
