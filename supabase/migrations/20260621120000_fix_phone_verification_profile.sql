-- Le client service_role (PostgREST) n'était pas reconnu par is_elevated_profile_mutation(),
-- ce qui bloquait phone_verified_at après un OTP correct.

CREATE OR REPLACE FUNCTION public.is_elevated_profile_mutation()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), '') = 'service_role'
    OR coalesce(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
      ''
    ) = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin', 'authenticator');
$$;

-- RPC atomique : application du numéro vérifié (bypass explicite pour le serveur).
CREATE OR REPLACE FUNCTION public.apply_verified_phone_profile(
  p_user_id uuid,
  p_phone_e164 text
)
RETURNS TABLE (
  ok boolean,
  error_code text,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_local text;
BEGIN
  IF p_user_id IS NULL OR p_phone_e164 IS NULL OR trim(p_phone_e164) = '' THEN
    RETURN QUERY SELECT false, 'INVALID_INPUT', 'Paramètres invalides.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.phone_e164 = p_phone_e164
      AND p.phone_verified_at IS NOT NULL
      AND p.id <> p_user_id
  ) THEN
    RETURN QUERY SELECT false, 'PHONE_IN_USE', 'Ce numéro est déjà utilisé par un autre compte.';
    RETURN;
  END IF;

  v_local := regexp_replace(p_phone_e164, '^\+216', '');

  UPDATE public.profiles
  SET
    phone = v_local,
    phone_e164 = p_phone_e164,
    phone_verified_at = v_now,
    verification_level = greatest(coalesce(verification_level, 1), 2)
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'NOT_FOUND', 'Profil introuvable.';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::text, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_verified_phone_profile(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_verified_phone_profile(uuid, text) TO service_role;
