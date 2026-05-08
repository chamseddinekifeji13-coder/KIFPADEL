-- Migration: Player Stats & Elo Ranking System
-- Creates stats tables and automated Elo calculation triggers.

-- PK column name on public.profiles is id (current) or legacy user_id — resolve dynamically.

CREATE OR REPLACE FUNCTION public.profile_row_pk_column()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.column_name
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'profiles'
    AND c.column_name IN ('id', 'user_id')
  ORDER BY CASE WHEN c.column_name = 'id' THEN 0 ELSE 1 END
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.profile_row_pk_column() IS 'Internal helper: profiles PK column name (id vs legacy user_id).';

-- 1. Table: player_stats (omit referenced column → targets profiles PK whichever name)
CREATE TABLE IF NOT EXISTS public.player_stats (
  player_id uuid PRIMARY KEY REFERENCES public.profiles ON DELETE CASCADE,
  matches_played integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  win_rate numeric(5,2) NOT NULL DEFAULT 0.00,
  current_streak integer NOT NULL DEFAULT 0,
  best_win_streak integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Initialize existing profiles in player_stats
DO $init_stats$
BEGIN
  EXECUTE format(
    $q$
      INSERT INTO public.player_stats (player_id)
      SELECT %I FROM public.profiles
      ON CONFLICT (player_id) DO NOTHING
    $q$,
    public.profile_row_pk_column()
  );
END $init_stats$;

-- 2. Table: player_rating_events (History)
CREATE TABLE IF NOT EXISTS public.player_rating_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.profiles ON DELETE CASCADE,
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  old_rating integer NOT NULL,
  new_rating integer NOT NULL,
  rating_change integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for fast querying of historical data
CREATE INDEX IF NOT EXISTS idx_player_rating_events_player_id ON public.player_rating_events(player_id);
CREATE INDEX IF NOT EXISTS idx_player_rating_events_created_at ON public.player_rating_events(created_at);

-- 3. Function to initialize stats on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_player_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pk uuid;
BEGIN
  pk := COALESCE(
    NULLIF(to_jsonb(NEW) ->> 'id', '')::uuid,
    NULLIF(to_jsonb(NEW) ->> 'user_id', '')::uuid
  );
  IF pk IS NOT NULL THEN
    INSERT INTO public.player_stats (player_id) VALUES (pk) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_stats ON public.profiles;
CREATE TRIGGER on_profile_created_stats
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_player_stats();

-- 4. Function: Calculate Elo & Update Stats
CREATE OR REPLACE FUNCTION public.process_match_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_a_players uuid[];
  team_b_players uuid[];
  team_a_avg_rating numeric;
  team_b_avg_rating numeric;
  expected_a numeric;
  rating_change integer;
  k_factor integer := 32;
  p_id uuid;
  p_rating integer;
  p_new_rating integer;
  p_streak integer;
  p_best_streak integer;
  p_wins integer;
  p_matches integer;
BEGIN
  -- We assume match_participants exist for this match_id
  -- Gather Team A and Team B players
  SELECT array_agg(player_id) INTO team_a_players FROM public.match_participants WHERE match_id = NEW.match_id AND team = 'A';
  SELECT array_agg(player_id) INTO team_b_players FROM public.match_participants WHERE match_id = NEW.match_id AND team = 'B';

  -- Calculate average rating for Team A
  EXECUTE format(
    $q$
      SELECT COALESCE(AVG(sport_rating), 1200)
      FROM public.profiles
      WHERE %I = ANY ($1::uuid[])
    $q$,
    public.profile_row_pk_column()
  ) INTO team_a_avg_rating USING team_a_players;

  EXECUTE format(
    $q$
      SELECT COALESCE(AVG(sport_rating), 1200)
      FROM public.profiles
      WHERE %I = ANY ($1::uuid[])
    $q$,
    public.profile_row_pk_column()
  ) INTO team_b_avg_rating USING team_b_players;

  expected_a := 1.0 / (1.0 + power(10.0, (team_b_avg_rating - team_a_avg_rating) / 400.0));

  IF NEW.winner_team = 'A' THEN
    rating_change := round(k_factor * (1.0 - expected_a));
  ELSE
    rating_change := round(k_factor * (0.0 - expected_a));
  END IF;

  IF team_a_players IS NOT NULL THEN
    FOREACH p_id IN ARRAY team_a_players
    LOOP
      EXECUTE format(
        $q$
          SELECT sport_rating FROM public.profiles WHERE %I = $1 LIMIT 1
        $q$,
        public.profile_row_pk_column()
      ) INTO p_rating USING p_id;

      p_new_rating := p_rating + rating_change;

      EXECUTE format(
        $q$
          UPDATE public.profiles SET sport_rating = $1 WHERE %I = $2
        $q$,
        public.profile_row_pk_column()
      ) USING p_new_rating, p_id;

      INSERT INTO public.player_rating_events (player_id, match_id, old_rating, new_rating, rating_change)
      VALUES (p_id, NEW.match_id, p_rating, p_new_rating, rating_change);

      SELECT current_streak, best_win_streak, wins, matches_played INTO p_streak, p_best_streak, p_wins, p_matches FROM public.player_stats WHERE player_id = p_id;

      p_matches := COALESCE(p_matches, 0) + 1;

      IF NEW.winner_team = 'A' THEN
        p_wins := COALESCE(p_wins, 0) + 1;
        IF COALESCE(p_streak, 0) < 0 THEN p_streak := 1; ELSE p_streak := COALESCE(p_streak, 0) + 1; END IF;
        IF p_streak > COALESCE(p_best_streak, 0) THEN p_best_streak := p_streak; END IF;
      ELSE
        IF COALESCE(p_streak, 0) > 0 THEN p_streak := -1; ELSE p_streak := COALESCE(p_streak, 0) - 1; END IF;
      END IF;

      UPDATE public.player_stats 
      SET 
        matches_played = p_matches,
        wins = p_wins,
        losses = p_matches - COALESCE(p_wins, 0),
        win_rate = ROUND((COALESCE(p_wins, 0)::numeric / NULLIF(p_matches, 0)::numeric) * 100, 2),
        current_streak = p_streak,
        best_win_streak = p_best_streak,
        updated_at = now()
      WHERE player_id = p_id;
    END LOOP;
  END IF;

  IF team_b_players IS NOT NULL THEN
    FOREACH p_id IN ARRAY team_b_players
    LOOP
      EXECUTE format(
        $q$
          SELECT sport_rating FROM public.profiles WHERE %I = $1 LIMIT 1
        $q$,
        public.profile_row_pk_column()
      ) INTO p_rating USING p_id;

      p_new_rating := p_rating - rating_change;

      EXECUTE format(
        $q$
          UPDATE public.profiles SET sport_rating = $1 WHERE %I = $2
        $q$,
        public.profile_row_pk_column()
      ) USING p_new_rating, p_id;

      INSERT INTO public.player_rating_events (player_id, match_id, old_rating, new_rating, rating_change)
      VALUES (p_id, NEW.match_id, p_rating, p_new_rating, -rating_change);

      SELECT current_streak, best_win_streak, wins, matches_played INTO p_streak, p_best_streak, p_wins, p_matches FROM public.player_stats WHERE player_id = p_id;

      p_matches := COALESCE(p_matches, 0) + 1;

      IF NEW.winner_team = 'B' THEN
        p_wins := COALESCE(p_wins, 0) + 1;
        IF COALESCE(p_streak, 0) < 0 THEN p_streak := 1; ELSE p_streak := COALESCE(p_streak, 0) + 1; END IF;
        IF p_streak > COALESCE(p_best_streak, 0) THEN p_best_streak := p_streak; END IF;
      ELSE
        IF COALESCE(p_streak, 0) > 0 THEN p_streak := -1; ELSE p_streak := COALESCE(p_streak, 0) - 1; END IF;
      END IF;

      UPDATE public.player_stats 
      SET 
        matches_played = p_matches,
        wins = p_wins,
        losses = p_matches - COALESCE(p_wins, 0),
        win_rate = ROUND((COALESCE(p_wins, 0)::numeric / NULLIF(p_matches, 0)::numeric) * 100, 2),
        current_streak = p_streak,
        best_win_streak = p_best_streak,
        updated_at = now()
      WHERE player_id = p_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_match_result_validated ON public.match_results;
CREATE TRIGGER on_match_result_validated
  AFTER INSERT ON public.match_results
  FOR EACH ROW EXECUTE FUNCTION public.process_match_result();

-- 6. RLS Policies
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_rating_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_stats_select" ON public.player_stats;
CREATE POLICY "player_stats_select" ON public.player_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "player_rating_events_select" ON public.player_rating_events;
CREATE POLICY "player_rating_events_select" ON public.player_rating_events FOR SELECT USING (true);
