-- Allow creating minimal/empty profiles at sign-up time.
-- Run this in Supabase SQL Editor.

BEGIN;

-- 1) Allow empty display name until onboarding completes.
ALTER TABLE public.profiles
  ALTER COLUMN display_name DROP NOT NULL;

-- 2) Create a schema-safe trigger function that inserts a minimal profile row.
--    It supports both possible key schemas: profiles.id or profiles.user_id.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key_col text;
BEGIN
  SELECT
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'id'
      ) THEN 'id'
      WHEN EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'user_id'
      ) THEN 'user_id'
      ELSE NULL
    END
  INTO v_key_col;

  IF v_key_col IS NULL THEN
    RAISE EXCEPTION 'profiles key column not found (expected id or user_id)';
  END IF;

  -- Minimal insert only. Other fields stay NULL/default until onboarding.
  EXECUTE format(
    'INSERT INTO public.profiles (%I) VALUES ($1) ON CONFLICT (%I) DO NOTHING',
    v_key_col,
    v_key_col
  )
  USING new.id;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

COMMIT;
