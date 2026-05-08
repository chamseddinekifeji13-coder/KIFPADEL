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

-- Ensure INSERT policy exists (harmonize with id vs legacy user_id PK)
DO $$
DECLARE
  pk_col text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_insert_self'
  ) THEN
    SELECT c.column_name INTO pk_col
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'profiles'
      AND c.column_name IN ('id', 'user_id')
    ORDER BY CASE c.column_name WHEN 'id' THEN 0 ELSE 1 END
    LIMIT 1;

    IF pk_col IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = %I)',
        pk_col
      );
    END IF;
  END IF;
END $$;