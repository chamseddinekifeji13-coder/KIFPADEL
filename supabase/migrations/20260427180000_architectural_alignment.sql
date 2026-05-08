-- Architectural Alignment Migration
-- 1. Define Global Roles
DO $$ BEGIN
    CREATE TYPE public.global_role AS ENUM ('super_admin', 'club_admin', 'club_staff', 'player', 'partner');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Update Profiles Table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS global_role public.global_role NOT NULL DEFAULT 'player';

-- 3. Automatic Profile Creation Trigger (profiles PK may be id or legacy user_id)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pk_col text;
  v_display text := COALESCE(
    new.raw_user_meta_data ->> 'display_name',
    split_part(new.email, '@', 1)
  );
BEGIN
  SELECT c.column_name INTO pk_col
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'profiles'
    AND c.column_name IN ('id', 'user_id')
  ORDER BY CASE c.column_name WHEN 'id' THEN 0 ELSE 1 END
  LIMIT 1;

  IF pk_col = 'id' THEN
    INSERT INTO public.profiles (id, display_name, email, global_role)
    VALUES (new.id, v_display, new.email, 'player')
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);
  ELSIF pk_col = 'user_id' THEN
    INSERT INTO public.profiles (user_id, display_name, email, global_role)
    VALUES (new.id, v_display, new.email, 'player')
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Update RLS for Global Roles
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DO $pol$
DECLARE
  pk_col text;
BEGIN
  SELECT c.column_name INTO pk_col
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'profiles'
    AND c.column_name IN ('id', 'user_id')
  ORDER BY CASE c.column_name WHEN 'id' THEN 0 ELSE 1 END
  LIMIT 1;

  IF pk_col IS NULL THEN
    RAISE EXCEPTION 'architectural_alignment: profiles PK id/user_id missing';
  END IF;

  EXECUTE format(
    $q$
      CREATE POLICY "profiles_select_all"
        ON public.profiles FOR SELECT
        USING (
          auth.uid() = %I
          OR global_role IN ('super_admin', 'club_staff', 'club_admin')
        )
    $q$,
    pk_col
  );
END $pol$;

-- 5. Ensure existing profiles have the role
UPDATE public.profiles SET global_role = 'player' WHERE global_role IS NULL;
