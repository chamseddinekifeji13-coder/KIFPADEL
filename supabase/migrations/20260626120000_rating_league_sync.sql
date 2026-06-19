-- Sync profiles.league avec sport_rating après chaque match (barème P tunisien).

CREATE OR REPLACE FUNCTION public.sport_category_from_rating(p_rating integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_rating >= 1750 THEN 'p1000'
    WHEN p_rating >= 1600 THEN 'p500'
    WHEN p_rating >= 1400 THEN 'p250'
    WHEN p_rating >= 1250 THEN 'p100'
    WHEN p_rating >= 1150 THEN 'p50'
    ELSE 'p25'
  END;
$$;

COMMENT ON FUNCTION public.sport_category_from_rating(integer) IS
  'Catégorie padel P dérivée du sport_rating (seuils alignés sur player-category.ts).';

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
  SELECT array_agg(player_id) INTO team_a_players
  FROM public.match_participants WHERE match_id = new.match_id AND team = 'A';
  SELECT array_agg(player_id) INTO team_b_players
  FROM public.match_participants WHERE match_id = new.match_id AND team = 'B';

  SELECT coalesce(avg(sport_rating), 1200) INTO team_a_avg_rating
  FROM public.profiles
  WHERE id = ANY(team_a_players);

  SELECT coalesce(avg(sport_rating), 1200) INTO team_b_avg_rating
  FROM public.profiles
  WHERE id = ANY(team_b_players);

  expected_a := 1.0 / (1.0 + power(10.0, (team_b_avg_rating - team_a_avg_rating) / 400.0));

  IF new.winner_team = 'A' THEN
    rating_change := round(k_factor * (1.0 - expected_a));
  ELSE
    rating_change := round(k_factor * (0.0 - expected_a));
  END IF;

  IF team_a_players IS NOT NULL THEN
    FOREACH p_id IN ARRAY team_a_players
    LOOP
      SELECT sport_rating INTO p_rating FROM public.profiles WHERE id = p_id;
      p_new_rating := p_rating + rating_change;
      UPDATE public.profiles
      SET
        sport_rating = p_new_rating,
        league = public.sport_category_from_rating(p_new_rating)
      WHERE id = p_id;
      INSERT INTO public.player_rating_events (player_id, match_id, old_rating, new_rating, rating_change)
      VALUES (p_id, new.match_id, p_rating, p_new_rating, rating_change);
      SELECT current_streak, best_win_streak, wins, matches_played INTO p_streak, p_best_streak, p_wins, p_matches
      FROM public.player_stats WHERE player_id = p_id;
      p_matches := p_matches + 1;
      IF new.winner_team = 'A' THEN
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
        win_rate = round((p_wins::numeric / p_matches::numeric) * 100, 2),
        current_streak = p_streak,
        best_win_streak = p_best_streak,
        updated_at = now()
      WHERE player_id = p_id;
    END LOOP;
  END IF;

  IF team_b_players IS NOT NULL THEN
    FOREACH p_id IN ARRAY team_b_players
    LOOP
      SELECT sport_rating INTO p_rating FROM public.profiles WHERE id = p_id;
      p_new_rating := p_rating - rating_change;
      UPDATE public.profiles
      SET
        sport_rating = p_new_rating,
        league = public.sport_category_from_rating(p_new_rating)
      WHERE id = p_id;
      INSERT INTO public.player_rating_events (player_id, match_id, old_rating, new_rating, rating_change)
      VALUES (p_id, new.match_id, p_rating, p_new_rating, -rating_change);
      SELECT current_streak, best_win_streak, wins, matches_played INTO p_streak, p_best_streak, p_wins, p_matches
      FROM public.player_stats WHERE player_id = p_id;
      p_matches := p_matches + 1;
      IF new.winner_team = 'B' THEN
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
        win_rate = round((p_wins::numeric / p_matches::numeric) * 100, 2),
        current_streak = p_streak,
        best_win_streak = p_best_streak,
        updated_at = now()
      WHERE player_id = p_id;
    END LOOP;
  END IF;

  RETURN new;
END;
$$;

-- Aligner les profils existants sur leur sport_rating actuel.
UPDATE public.profiles
SET league = public.sport_category_from_rating(sport_rating)
WHERE league IS NULL
   OR league <> public.sport_category_from_rating(sport_rating);
