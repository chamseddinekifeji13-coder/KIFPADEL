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

-- 3. Automatic Profile Creation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email, global_role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), 
    new.email, 
    'player'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Update RLS for Global Roles
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = user_id 
    OR global_role IN ('super_admin', 'club_staff', 'club_admin')
  );

-- 5. Ensure existing profiles have the role
UPDATE public.profiles SET global_role = 'player' WHERE global_role IS NULL;
