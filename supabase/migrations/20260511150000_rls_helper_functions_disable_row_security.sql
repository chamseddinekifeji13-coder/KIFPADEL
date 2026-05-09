-- Helpers used in RLS (is_super_admin, is_platform_*, has_club_role) must read
-- public.profiles / public.club_memberships without triggering those same tables' policies
-- again — otherwise Postgres re-enters USING (...) / is_*(...) and overflows the stack.

BEGIN;

-- Canonical implementation after 20260507140000_club_memberships_user_id (user_id FK).
CREATE OR REPLACE FUNCTION public.has_club_role(target_club_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_memberships cm
    WHERE cm.club_id = target_club_id
      AND cm.user_id = auth.uid()
      AND cm.role::text = ANY (allowed_roles)
  );
$$;

ALTER FUNCTION public.has_club_role(uuid, text[]) SET row_security TO off;

CREATE OR REPLACE FUNCTION public.is_platform_membership_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_memberships cm
    WHERE cm.user_id = auth.uid()
      AND cm.role::text = 'platform_admin'
  );
$$;

ALTER FUNCTION public.is_platform_membership_admin() SET row_security TO off;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_membership_admin();
$$;

ALTER FUNCTION public.is_platform_admin() SET row_security TO off;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.global_role::text = 'super_admin'
  );
$$;

ALTER FUNCTION public.is_super_admin() SET row_security TO off;

COMMENT ON FUNCTION public.is_super_admin() IS
  'True when authenticated user profiles.global_role = super_admin. RLS bypass inside via row_security off.';

COMMENT ON FUNCTION public.is_platform_membership_admin() IS
  'Historical: club_memberships.role = platform_admin. Reads bypass RLS to avoid recursion.';

COMMENT ON FUNCTION public.is_platform_admin() IS
  'Alias of is_platform_membership_admin(); defined with RLS-safe reads.';

GRANT EXECUTE ON FUNCTION public.has_club_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_club_role(uuid, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_membership_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_membership_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO service_role;

COMMIT;
