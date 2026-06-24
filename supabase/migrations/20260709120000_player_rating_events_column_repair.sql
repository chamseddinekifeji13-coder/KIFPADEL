-- Réparation schéma legacy : prod peut avoir rating_before / rating_after / delta
-- alors que process_match_result() et l'app attendent old_rating / new_rating / rating_change
-- (CREATE TABLE IF NOT EXISTS ne rattrape pas les colonnes d'une table préexistante).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'player_rating_events'
      AND column_name = 'rating_before'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'player_rating_events'
      AND column_name = 'old_rating'
  ) THEN
    ALTER TABLE public.player_rating_events
      RENAME COLUMN rating_before TO old_rating;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'player_rating_events'
      AND column_name = 'rating_after'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'player_rating_events'
      AND column_name = 'new_rating'
  ) THEN
    ALTER TABLE public.player_rating_events
      RENAME COLUMN rating_after TO new_rating;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'player_rating_events'
      AND column_name = 'delta'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'player_rating_events'
      AND column_name = 'rating_change'
  ) THEN
    ALTER TABLE public.player_rating_events
      RENAME COLUMN delta TO rating_change;
  END IF;
END $$;

ALTER TABLE public.player_rating_events
  ADD COLUMN IF NOT EXISTS old_rating integer,
  ADD COLUMN IF NOT EXISTS new_rating integer,
  ADD COLUMN IF NOT EXISTS rating_change integer;

COMMENT ON TABLE public.player_rating_events IS
  'Historique ELO par match — colonnes canoniques old_rating, new_rating, rating_change.';
