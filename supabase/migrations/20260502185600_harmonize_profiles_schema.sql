-- Migration to harmonize profiles table and fix missing columns
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS city text DEFAULT 'Tunis',
  ADD COLUMN IF NOT EXISTS league text NOT NULL DEFAULT 'Bronze',
  ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS verification_level smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sport_rating integer NOT NULL DEFAULT 1200;

-- Ensure RLS is correct for new columns
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add a policy for INSERT if it doesn't exist (already tried in previous migration but repeating for safety)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'profiles_insert_self'
    ) THEN
        CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;
