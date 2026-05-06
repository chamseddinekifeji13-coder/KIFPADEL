-- Rename user_id to id in public.profiles
BEGIN;

-- 1. Rename the column
ALTER TABLE public.profiles RENAME COLUMN user_id TO id;

-- 2. Update the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- 3. Update RLS policies
-- We need to drop and recreate them because column names in policies are fixed at creation time.

-- profiles_select_self
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
CREATE POLICY "profiles_select_self"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_platform_admin());

-- profiles_update_self
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_platform_admin())
  WITH CHECK (auth.uid() = id OR public.is_platform_admin());

-- profiles_select_all (from architectural alignment)
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id 
    OR global_role IN ('super_admin', 'club_staff', 'club_admin')
  );

-- profiles_insert_self
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

COMMIT;
