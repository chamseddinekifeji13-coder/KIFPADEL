-- Super admin bootstrap (run in Supabase SQL Editor)
-- 1) Replace the email below with your target account email.
-- 2) Ensure the user exists in Authentication > Users.

DO $$
DECLARE
  v_email text := 'owner@example.com';
  v_user_id uuid;
  v_profile_key text;
  v_club_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User % not found in auth.users. Create it first in Supabase Auth.', v_email;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id'
  ) THEN
    v_profile_key := 'id';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    v_profile_key := 'user_id';
  ELSE
    RAISE EXCEPTION 'profiles key column not found (expected id or user_id).';
  END IF;

  -- Ensure profile exists
  EXECUTE format(
    'INSERT INTO public.profiles (%I, display_name, email)
     VALUES ($1, $2, $3)
     ON CONFLICT (%I) DO UPDATE SET email = EXCLUDED.email',
    v_profile_key, v_profile_key
  )
  USING v_user_id, 'Super Admin', v_email;

  -- Promote global role when the column exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'global_role'
  ) THEN
    EXECUTE format(
      'UPDATE public.profiles SET global_role = %L WHERE %I = $1',
      'super_admin', v_profile_key
    )
    USING v_user_id;
  END IF;

  -- Get a club or create a platform club
  SELECT id INTO v_club_id
  FROM public.clubs
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_club_id IS NULL THEN
    INSERT INTO public.clubs (name, city, is_active)
    VALUES ('Kifpadel Platform', 'Tunis', true)
    RETURNING id INTO v_club_id;
  END IF;

  -- Grant platform admin membership
  INSERT INTO public.club_memberships (club_id, player_id, role, is_primary)
  VALUES (v_club_id, v_user_id, 'platform_admin', false)
  ON CONFLICT (club_id, player_id)
  DO UPDATE SET role = EXCLUDED.role, is_primary = EXCLUDED.is_primary;

  RAISE NOTICE 'Super admin bootstrap done for % (user_id=%).', v_email, v_user_id;
END $$;
