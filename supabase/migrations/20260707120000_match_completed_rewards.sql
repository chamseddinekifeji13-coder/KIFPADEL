-- Bonus confiance (+4) et traçabilité par match après validation du score.
-- Complète process_match_result (ELO + league déjà gérés).

-- Schéma legacy : trust_events peut exister sans `kind` si la table a été créée
-- avant la migration init (CREATE TABLE IF NOT EXISTS ne rattrape pas les colonnes).
ALTER TABLE public.trust_events
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS delta integer,
  ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL;

UPDATE public.trust_events
SET kind = 'legacy_unknown'
WHERE kind IS NULL;

UPDATE public.trust_events
SET delta = 0
WHERE delta IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trust_events'
      AND column_name = 'kind'
      AND is_nullable = 'YES'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.trust_events WHERE kind IS NULL LIMIT 1
  ) THEN
    ALTER TABLE public.trust_events ALTER COLUMN kind SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trust_events'
      AND column_name = 'delta'
      AND is_nullable = 'YES'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.trust_events WHERE delta IS NULL LIMIT 1
  ) THEN
    ALTER TABLE public.trust_events ALTER COLUMN delta SET NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trust_events_player_match_kind
  ON public.trust_events (player_id, match_id, kind)
  WHERE match_id IS NOT NULL;

COMMENT ON COLUMN public.trust_events.match_id IS
  'Match source pour les événements automatiques (ex. good_behavior après score validé).';

CREATE OR REPLACE FUNCTION public.apply_system_trust_delta(
  p_player_id uuid,
  p_kind text,
  p_delta integer,
  p_match_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old int;
  v_new int;
  v_status text := 'healthy';
  v_event_id uuid;
BEGIN
  IF p_match_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.trust_events te
    WHERE te.player_id = p_player_id
      AND te.match_id = p_match_id
      AND te.kind = p_kind
  ) THEN
    RETURN NULL;
  END IF;

  SELECT trust_score INTO v_old
  FROM public.profiles
  WHERE id = p_player_id
  FOR UPDATE;

  IF v_old IS NULL THEN
    RETURN NULL;
  END IF;

  v_new := LEAST(100, GREATEST(0, v_old + p_delta));

  IF v_new < 25 THEN
    v_status := 'blacklisted';
  ELSIF v_new < 45 THEN
    v_status := 'restricted';
  ELSIF v_new < 70 THEN
    v_status := 'warning';
  END IF;

  INSERT INTO public.trust_events (player_id, kind, delta, match_id)
  VALUES (p_player_id, p_kind, p_delta, p_match_id)
  RETURNING id INTO v_event_id;

  UPDATE public.profiles
  SET trust_score = v_new, reliability_status = v_status
  WHERE id = p_player_id;

  RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION public.apply_system_trust_delta(uuid, text, integer, uuid) IS
  'Ajustement trust système (trigger match) — idempotent par (player, match, kind).';

REVOKE ALL ON FUNCTION public.apply_system_trust_delta(uuid, text, integer, uuid) FROM PUBLIC;

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
  FROM public.match_participants
  WHERE match_id = new.match_id
    AND team = 'A'
    AND coalesce(status, 'pending') NOT IN ('declined', 'cancelled');

  SELECT array_agg(player_id) INTO team_b_players
  FROM public.match_participants
  WHERE match_id = new.match_id
    AND team = 'B'
    AND coalesce(status, 'pending') NOT IN ('declined', 'cancelled');

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
      p_matches := coalesce(p_matches, 0) + 1;
      IF new.winner_team = 'A' THEN
        p_wins := coalesce(p_wins, 0) + 1;
        IF coalesce(p_streak, 0) < 0 THEN p_streak := 1; ELSE p_streak := coalesce(p_streak, 0) + 1; END IF;
        IF p_streak > coalesce(p_best_streak, 0) THEN p_best_streak := p_streak; END IF;
      ELSE
        IF coalesce(p_streak, 0) > 0 THEN p_streak := -1; ELSE p_streak := coalesce(p_streak, 0) - 1; END IF;
      END IF;
      UPDATE public.player_stats
      SET
        matches_played = p_matches,
        wins = coalesce(p_wins, 0),
        losses = p_matches - coalesce(p_wins, 0),
        win_rate = round((coalesce(p_wins, 0)::numeric / p_matches::numeric) * 100, 2),
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
      p_matches := coalesce(p_matches, 0) + 1;
      IF new.winner_team = 'B' THEN
        p_wins := coalesce(p_wins, 0) + 1;
        IF coalesce(p_streak, 0) < 0 THEN p_streak := 1; ELSE p_streak := coalesce(p_streak, 0) + 1; END IF;
        IF p_streak > coalesce(p_best_streak, 0) THEN p_best_streak := p_streak; END IF;
      ELSE
        IF coalesce(p_streak, 0) > 0 THEN p_streak := -1; ELSE p_streak := coalesce(p_streak, 0) - 1; END IF;
      END IF;
      UPDATE public.player_stats
      SET
        matches_played = p_matches,
        wins = coalesce(p_wins, 0),
        losses = p_matches - coalesce(p_wins, 0),
        win_rate = round((coalesce(p_wins, 0)::numeric / p_matches::numeric) * 100, 2),
        current_streak = p_streak,
        best_win_streak = p_best_streak,
        updated_at = now()
      WHERE player_id = p_id;
    END LOOP;
  END IF;

  -- Bonus confiance : match joué sans incident (+4 par participant sur une équipe).
  FOR p_id IN
    SELECT mp.player_id
    FROM public.match_participants mp
    WHERE mp.match_id = new.match_id
      AND mp.team IN ('A', 'B')
      AND coalesce(mp.status, 'pending') NOT IN ('declined', 'cancelled')
  LOOP
    PERFORM public.apply_system_trust_delta(p_id, 'good_behavior', 4, new.match_id);
  END LOOP;

  RETURN new;
END;
$$;
