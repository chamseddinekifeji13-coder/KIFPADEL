-- -----------------------------------------------------------------------------
-- Super Admin V1 — security alignment
--
-- Principles:
-- * Platform-wide administration is tied to profiles.global_role = super_admin only.
--   See docs/SUPER_ADMIN.md for client-side expectations.
-- * is_platform_auth_admin() retains the historical club_memberships.platform_admin rows
--   for tenant helpers (never used for sponsors or global profiles listing).
-- * Trust score updates bypass fragile per-row RLS via SECURITY DEFINER RPC
--   apply_trust_adjustment (validated inside the function).
-- -----------------------------------------------------------------------------

-- 1) is_super_admin: single source for platform RBAC checks in SQL policies.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.global_role::text = 'super_admin'
  );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
  'True when authenticated user profiles.global_role = super_admin (platform operator). Used by RLS.';

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO service_role;


-- 2) Rename semantics: old is_platform_admin() became ambiguous. Preserve membership check under a clearer name.
CREATE OR REPLACE FUNCTION public.is_platform_membership_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_memberships cm
    WHERE cm.user_id = auth.uid()
      AND cm.role::text = 'platform_admin'
  );
$$;

COMMENT ON FUNCTION public.is_platform_membership_admin() IS
  'Historical: club_memberships.role = platform_admin. Not a global super admin.';

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_membership_admin();
$$;

COMMENT ON FUNCTION public.is_platform_admin() IS
  'Alias of is_platform_membership_admin() for backward-compatible RPC/policy names.';


-- 3) Trust adjustment RPC (club staff WITH booking OR staff WITH main-club affinity; plus super_admin).
CREATE OR REPLACE FUNCTION public.apply_trust_adjustment(
  p_player_id uuid,
  p_kind text,
  p_delta integer,
  p_booking_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_old int;
  v_new int;
  v_status text := 'healthy';
  v_event_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'trust_adjustment: not authenticated';
  END IF;

  IF NOT public.is_super_admin() THEN
    IF p_booking_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = p_booking_id
          AND b.created_by = p_player_id
          AND public.has_club_role(
            b.club_id,
            ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
          )
      ) THEN
        RAISE EXCEPTION 'trust_adjustment: forbidden through booking scope';
      END IF;
    ELSE
      IF NOT EXISTS (
        SELECT 1
        FROM public.profiles pr
        INNER JOIN public.club_memberships cm
          ON cm.club_id = pr.main_club_id
         AND cm.user_id = v_actor
        WHERE pr.id = p_player_id
          AND pr.main_club_id IS NOT NULL
          AND cm.role::text = ANY (
            ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
          )
      ) THEN
        RAISE EXCEPTION 'trust_adjustment: forbidden without booking (no staff link to player main club)';
      END IF;
    END IF;
  END IF;

  SELECT trust_score INTO v_old FROM public.profiles WHERE id = p_player_id FOR UPDATE;

  IF v_old IS NULL THEN
    RAISE EXCEPTION 'trust_adjustment: unknown player profile';
  END IF;

  v_new := LEAST(100, GREATEST(0, v_old + p_delta));

  IF v_new < 25 THEN
    v_status := 'blacklisted';
  ELSIF v_new < 45 THEN
    v_status := 'restricted';
  ELSIF v_new < 70 THEN
    v_status := 'warning';
  ELSE
    v_status := 'healthy';
  END IF;

  INSERT INTO public.trust_events (player_id, kind, delta, booking_id)
  VALUES (p_player_id, p_kind, p_delta, p_booking_id)
  RETURNING id INTO v_event_id;

  UPDATE public.profiles
  SET trust_score = v_new, reliability_status = v_status
  WHERE id = p_player_id;

  RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION public.apply_trust_adjustment(uuid, text, integer, uuid) IS
  'Applies trust delta + persists trust_events row. Authorization enforced inside.';
REVOKE ALL ON FUNCTION public.apply_trust_adjustment(uuid, text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_trust_adjustment(uuid, text, integer, uuid) TO authenticated;


-- 4) profiles — tighten cross-tenant PII
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
CREATE POLICY "profiles_select_self"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_super_admin_platform"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin());

COMMENT ON POLICY "profiles_select_super_admin_platform" ON public.profiles IS
  'Replaces permissive profiles_select_all: ONLY super admins list all profiles.';

-- Same-club roster visibility for club operators (scoped PII vs global).
DROP POLICY IF EXISTS "profiles_select_club_staff_roster" ON public.profiles;
CREATE POLICY "profiles_select_club_staff_roster"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.club_memberships cm_staff
      INNER JOIN public.club_memberships cm_member
        ON cm_member.club_id = cm_staff.club_id
      WHERE cm_staff.user_id = auth.uid()
        AND cm_member.user_id = public.profiles.id
        AND cm_staff.role::text = ANY (
          ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
        )
    )
  );

COMMENT ON POLICY "profiles_select_club_staff_roster" ON public.profiles IS
  'Staff sees profiles of players who share a club membership row (same tenant).';

-- Staff may see transient guests who booked at their venue (outside roster).
DROP POLICY IF EXISTS "profiles_select_club_staff_booking_guest" ON public.profiles;
CREATE POLICY "profiles_select_club_staff_booking_guest"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      INNER JOIN public.club_memberships cm
        ON cm.club_id = b.club_id
       AND cm.user_id = auth.uid()
      WHERE b.created_by = public.profiles.id
        AND cm.role::text = ANY (
          ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
        )
    )
  );

COMMENT ON POLICY "profiles_select_club_staff_booking_guest" ON public.profiles IS
  'Staff sees creators of bookings at clubs they administer.';

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR public.is_super_admin()
  )
  WITH CHECK (
    auth.uid() = id
    OR public.is_super_admin()
  );


-- 5) club_memberships — super admin readability
DROP POLICY IF EXISTS "club_memberships_select_super_admin" ON public.club_memberships;
CREATE POLICY "club_memberships_select_super_admin"
  ON public.club_memberships FOR SELECT
  USING (public.is_super_admin());


-- 6) clubs — visibility + moderation for platform team
DROP POLICY IF EXISTS "clubs_public_read" ON public.clubs;
CREATE POLICY "clubs_public_read"
  ON public.clubs FOR SELECT
  USING (is_active = true OR public.is_super_admin() OR public.is_platform_admin());

COMMENT ON POLICY "clubs_public_read" ON public.clubs IS
  'Public sees active clubs; platform super admins and legacy membership platform_admin see deactivated rows too.';

DROP POLICY IF EXISTS "clubs_update_super_admin" ON public.clubs;
CREATE POLICY "clubs_update_super_admin"
  ON public.clubs FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- 7) sponsors — super admin manages
DROP POLICY IF EXISTS "sponsors_public_read" ON public.sponsors;
CREATE POLICY "sponsors_public_read"
  ON public.sponsors FOR SELECT
  USING (is_active = true OR public.is_super_admin());

DROP POLICY IF EXISTS "sponsors_manage_admin" ON public.sponsors;
CREATE POLICY "sponsors_manage_super_admin"
  ON public.sponsors FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- 8) trust_events — direct INSERT removed from clients; RPC only incurs writes.
DROP POLICY IF EXISTS "trust_events_insert_staff" ON public.trust_events;

DROP POLICY IF EXISTS "trust_events_select_self_or_staff" ON public.trust_events;
CREATE POLICY "trust_events_select_scoped"
  ON public.trust_events FOR SELECT
  USING (
    player_id = auth.uid()
    OR public.is_super_admin()
    OR (
      booking_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = trust_events.booking_id
          AND public.has_club_role(
            b.club_id,
            ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
          )
      )
    )
  );


-- 9) incidents — global read-only for super admin dashboards
DROP POLICY IF EXISTS "incidents_select_super_admin" ON public.incidents;
CREATE POLICY "incidents_select_super_admin"
  ON public.incidents FOR SELECT
  USING (public.is_super_admin());


-- 10) member_cards — platform-only admin mutates QR records
DROP POLICY IF EXISTS "member_cards_select_self_or_staff" ON public.member_cards;
CREATE POLICY "member_cards_select_self_or_super_admin"
  ON public.member_cards FOR SELECT
  USING (player_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "member_cards_upsert_staff" ON public.member_cards;
CREATE POLICY "member_cards_upsert_super_admin"
  ON public.member_cards FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
