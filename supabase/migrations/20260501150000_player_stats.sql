-- Migration: Player Stats & Elo Ranking System
-- Creates stats tables and automated Elo calculation triggers.

-- 1. Table: player_stats
CREATE TABLE IF NOT EXISTS public.player_stats (
  player_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  matches_played integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  win_rate numeric(5,2) NOT NULL DEFAULT 0.00,
  current_streak integer NOT NULL DEFAULT 0,
  best_win_streak integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Initialize existing profiles in player_stats
INSERT INTO public.player_stats (player_id)
SELECT user_id FROM public.profiles
ON CONFLICT (player_id) DO NOTHING;

-- 2. Table: player_rating_events (History)
CREATE TABLE IF NOT EXISTS public.player_rating_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
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
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.player_stats (player_id) VALUES (new.user_id) ON CONFLICT DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_stats ON public.profiles;
CREATE TRIGGER on_profile_created_stats
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_player_stats();

-- 4. Function: Calculate Elo & Update Stats
CREATE OR REPLACE FUNCTION public.process_match_result()
RETURNS trigger AS $$
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
  SELECT COALESCE(AVG(sport_rating), 1200) INTO team_a_avg_rating 
  FROM public.profiles 
  WHERE user_id = ANY(team_a_players);

  -- Calculate average rating for Team B
  SELECT COALESCE(AVG(sport_rating), 1200) INTO team_b_avg_rating 
  FROM public.profiles 
  WHERE user_id = ANY(team_b_players);

  -- Elo Expected Probability for Team A
  -- E_a = 1 / (1 + 10^((R_b - R_a) / 400))
  expected_a := 1.0 / (1.0 + power(10.0, (team_b_avg_rating - team_a_avg_rating) / 400.0));

  -- Calculate Rating Change (Delta)
  IF NEW.winner_team = 'A' THEN
    rating_change := round(k_factor * (1.0 - expected_a));
  ELSE
    rating_change := round(k_factor * (0.0 - expected_a));
  END IF;

  -- Update Team A Players
  IF team_a_players IS NOT NULL THEN
    FOREACH p_id IN ARRAY team_a_players
    LOOP
      -- Get current rating
      SELECT sport_rating INTO p_rating FROM public.profiles WHERE user_id = p_id;
      p_new_rating := p_rating + rating_change;

      -- Update Profile
      UPDATE public.profiles SET sport_rating = p_new_rating WHERE user_id = p_id;

      -- Insert History
      INSERT INTO public.player_rating_events (player_id, match_id, old_rating, new_rating, rating_change)
      VALUES (p_id, NEW.match_id, p_rating, p_new_rating, rating_change);

      -- Update Stats
      SELECT current_streak, best_win_streak, wins, matches_played INTO p_streak, p_best_streak, p_wins, p_matches FROM public.player_stats WHERE player_id = p_id;
      
      p_matches := p_matches + 1;
      
      IF NEW.winner_team = 'A' THEN
        p_wins := p_wins + 1;
        IF p_streak < 0 THEN p_streak := 1; ELSE p_streak := p_streak + 1; END IF;
        IF p_streak > p_best_streak THEN p_best_streak := p_streak; END IF;
      ELSE
        IF p_streak > 0 THEN p_streak := -1; ELSE p_streak := p_streak - 1; END IF;
      END IF;

      UPDATE public.player_stats 
      SET 
        matches_played = p_matches,
        wins = p_wins,
        losses = p_matches - p_wins,
        win_rate = ROUND((p_wins::numeric / p_matches::numeric) * 100, 2),
        current_streak = p_streak,
        best_win_streak = p_best_streak,
        updated_at = now()
      WHERE player_id = p_id;
    END LOOP;
  END IF;

  -- Update Team B Players
  IF team_b_players IS NOT NULL THEN
    FOREACH p_id IN ARRAY team_b_players
    LOOP
      -- Get current rating
      SELECT sport_rating INTO p_rating FROM public.profiles WHERE user_id = p_id;
      p_new_rating := p_rating - rating_change; -- Opposite of A

      -- Update Profile
      UPDATE public.profiles SET sport_rating = p_new_rating WHERE user_id = p_id;

      -- Insert History
      INSERT INTO public.player_rating_events (player_id, match_id, old_rating, new_rating, rating_change)
      VALUES (p_id, NEW.match_id, p_rating, p_new_rating, -rating_change);

      -- Update Stats
      SELECT current_streak, best_win_streak, wins, matches_played INTO p_streak, p_best_streak, p_wins, p_matches FROM public.player_stats WHERE player_id = p_id;
      
      p_matches := p_matches + 1;
      
      IF NEW.winner_team = 'B' THEN
        p_wins := p_wins + 1;
        IF p_streak < 0 THEN p_streak := 1; ELSE p_streak := p_streak + 1; END IF;
        IF p_streak > p_best_streak THEN p_best_streak := p_streak; END IF;
      ELSE
        IF p_streak > 0 THEN p_streak := -1; ELSE p_streak := p_streak - 1; END IF;
      END IF;

      UPDATE public.player_stats 
      SET 
        matches_played = p_matches,
        wins = p_wins,
        losses = p_matches - p_wins,
        win_rate = ROUND((p_wins::numeric / p_matches::numeric) * 100, 2),
        current_streak = p_streak,
        best_win_streak = p_best_streak,
        updated_at = now()
      WHERE player_id = p_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger on Match Result Validation
DROP TRIGGER IF EXISTS on_match_result_validated ON public.match_results;
CREATE TRIGGER on_match_result_validated
  AFTER INSERT ON public.match_results
  FOR EACH ROW EXECUTE FUNCTION public.process_match_result();

-- 6. RLS Policies
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_rating_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_stats_select" ON public.player_stats FOR SELECT USING (true);
CREATE POLICY "player_rating_events_select" ON public.player_rating_events FOR SELECT USING (true);
