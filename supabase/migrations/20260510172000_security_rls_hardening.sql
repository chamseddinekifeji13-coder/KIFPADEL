-- Security hardening after audit:
-- - prevent authenticated users from self-promoting global roles
-- - remove broad profile reads based on row global_role
-- - align trust event writes with club incident workflows

BEGIN;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
CREATE POLICY "profiles_select_self"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.prevent_profile_global_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  IF OLD.global_role IS NOT DISTINCT FROM NEW.global_role THEN
    RETURN NEW;
  END IF;

  jwt_role := current_setting('request.jwt.claim.role', true);

  IF jwt_role = 'service_role' OR public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'global_role cannot be changed by this role'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_global_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_global_role_escalation
BEFORE UPDATE OF global_role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_global_role_escalation();

REVOKE UPDATE (global_role) ON public.profiles FROM anon, authenticated;

ALTER TABLE public.trust_events
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reason text;

DROP POLICY IF EXISTS "trust_events_insert_staff" ON public.trust_events;
CREATE POLICY "trust_events_insert_staff"
  ON public.trust_events FOR INSERT
  WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = trust_events.booking_id
        AND public.has_club_role(
          b.club_id,
          ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']
        )
    )
  );

DROP POLICY IF EXISTS "trust_events_select_self_or_staff" ON public.trust_events;
CREATE POLICY "trust_events_select_self_or_staff"
  ON public.trust_events FOR SELECT
  USING (
    player_id = auth.uid()
    OR public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = trust_events.booking_id
        AND public.has_club_role(
          b.club_id,
          ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']
        )
    )
  );

COMMIT;
