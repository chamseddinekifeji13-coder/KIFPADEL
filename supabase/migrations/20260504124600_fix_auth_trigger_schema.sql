-- Align auth trigger with profiles PK (id vs legacy user_id) and optional email on profiles.
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
    INSERT INTO public.profiles (id, display_name)
    VALUES (new.id, v_display)
    ON CONFLICT (id) DO NOTHING;
  ELSIF pk_col = 'user_id' THEN
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (new.id, v_display)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;
