-- Ligues / championnats club : divisions, classement saisonnier, montée / descente.

CREATE TABLE IF NOT EXISTS public.competitive_leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs (id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  season_label text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'registration_open', 'active', 'completed', 'cancelled')
  ),
  points_per_win integer NOT NULL DEFAULT 3 CHECK (points_per_win >= 0),
  points_per_loss integer NOT NULL DEFAULT 0 CHECK (points_per_loss >= 0),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS competitive_leagues_club_id_idx ON public.competitive_leagues (club_id);
CREATE INDEX IF NOT EXISTS competitive_leagues_status_idx ON public.competitive_leagues (status);

CREATE TABLE IF NOT EXISTS public.league_divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.competitive_leagues (id) ON DELETE CASCADE,
  name text NOT NULL,
  level_order integer NOT NULL CHECK (level_order >= 1),
  promotion_slots integer NOT NULL DEFAULT 2 CHECK (promotion_slots >= 0),
  relegation_slots integer NOT NULL DEFAULT 2 CHECK (relegation_slots >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT league_divisions_unique_level UNIQUE (league_id, level_order),
  CONSTRAINT league_divisions_unique_name UNIQUE (league_id, name)
);

CREATE INDEX IF NOT EXISTS league_divisions_league_id_idx ON public.league_divisions (league_id);

CREATE TABLE IF NOT EXISTS public.league_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.competitive_leagues (id) ON DELETE CASCADE,
  division_id uuid NOT NULL REFERENCES public.league_divisions (id) ON DELETE RESTRICT,
  team_name text,
  player1_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  player2_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'registered' CHECK (
    status IN ('registered', 'active', 'withdrawn')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT league_entries_distinct_players CHECK (player1_id <> player2_id)
);

CREATE INDEX IF NOT EXISTS league_entries_league_id_idx ON public.league_entries (league_id);
CREATE INDEX IF NOT EXISTS league_entries_division_id_idx ON public.league_entries (division_id);
CREATE UNIQUE INDEX IF NOT EXISTS league_entries_pair_uidx
  ON public.league_entries (league_id, player1_id, player2_id);

CREATE TABLE IF NOT EXISTS public.league_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.competitive_leagues (id) ON DELETE CASCADE,
  division_id uuid NOT NULL REFERENCES public.league_divisions (id) ON DELETE RESTRICT,
  home_entry_id uuid NOT NULL REFERENCES public.league_entries (id) ON DELETE CASCADE,
  away_entry_id uuid NOT NULL REFERENCES public.league_entries (id) ON DELETE CASCADE,
  home_sets_won integer NOT NULL DEFAULT 0 CHECK (home_sets_won >= 0),
  away_sets_won integer NOT NULL DEFAULT 0 CHECK (away_sets_won >= 0),
  winner_entry_id uuid NOT NULL REFERENCES public.league_entries (id) ON DELETE CASCADE,
  played_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT league_results_distinct_entries CHECK (home_entry_id <> away_entry_id)
);

CREATE INDEX IF NOT EXISTS league_results_league_id_idx ON public.league_results (league_id);
CREATE INDEX IF NOT EXISTS league_results_division_id_idx ON public.league_results (division_id);

CREATE TABLE IF NOT EXISTS public.league_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.competitive_leagues (id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.league_entries (id) ON DELETE CASCADE,
  from_division_id uuid NOT NULL REFERENCES public.league_divisions (id) ON DELETE RESTRICT,
  to_division_id uuid NOT NULL REFERENCES public.league_divisions (id) ON DELETE RESTRICT,
  movement text NOT NULL CHECK (movement IN ('promoted', 'relegated', 'stayed')),
  season_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS league_movements_league_id_idx ON public.league_movements (league_id);

CREATE OR REPLACE FUNCTION public.set_competitive_leagues_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS competitive_leagues_set_updated_at ON public.competitive_leagues;
CREATE TRIGGER competitive_leagues_set_updated_at
  BEFORE UPDATE ON public.competitive_leagues
  FOR EACH ROW EXECUTE FUNCTION public.set_competitive_leagues_updated_at();

CREATE OR REPLACE FUNCTION public.league_entries_division_same_league()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.league_divisions d
    WHERE d.id = NEW.division_id
      AND d.league_id = NEW.league_id
  ) THEN
    RAISE EXCEPTION 'league_entries: division does not belong to league';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS league_entries_division_same_league ON public.league_entries;
CREATE TRIGGER league_entries_division_same_league
  BEFORE INSERT OR UPDATE ON public.league_entries
  FOR EACH ROW EXECUTE FUNCTION public.league_entries_division_same_league();

-- RLS
ALTER TABLE public.competitive_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competitive_leagues_select_all" ON public.competitive_leagues;
CREATE POLICY "competitive_leagues_select_all"
  ON public.competitive_leagues FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "competitive_leagues_insert_staff" ON public.competitive_leagues;
CREATE POLICY "competitive_leagues_insert_staff"
  ON public.competitive_leagues FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.has_club_role(
      club_id,
      ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
    )
  );

DROP POLICY IF EXISTS "competitive_leagues_update_staff" ON public.competitive_leagues;
CREATE POLICY "competitive_leagues_update_staff"
  ON public.competitive_leagues FOR UPDATE
  USING (
    public.has_club_role(
      club_id,
      ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
    )
  )
  WITH CHECK (
    public.has_club_role(
      club_id,
      ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
    )
  );

DROP POLICY IF EXISTS "league_divisions_select_all" ON public.league_divisions;
CREATE POLICY "league_divisions_select_all"
  ON public.league_divisions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "league_divisions_manage_staff" ON public.league_divisions;
CREATE POLICY "league_divisions_manage_staff"
  ON public.league_divisions FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.competitive_leagues l
      WHERE l.id = league_divisions.league_id
        AND public.has_club_role(
          l.club_id,
          ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.competitive_leagues l
      WHERE l.id = league_divisions.league_id
        AND public.has_club_role(
          l.club_id,
          ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
        )
    )
  );

DROP POLICY IF EXISTS "league_entries_select_all" ON public.league_entries;
CREATE POLICY "league_entries_select_all"
  ON public.league_entries FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "league_entries_insert_self_player1" ON public.league_entries;
CREATE POLICY "league_entries_insert_self_player1"
  ON public.league_entries FOR INSERT
  WITH CHECK (
    player1_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.competitive_leagues l
      WHERE l.id = league_id
        AND l.status = 'registration_open'
    )
  );

DROP POLICY IF EXISTS "league_entries_manage_staff" ON public.league_entries;
CREATE POLICY "league_entries_manage_staff"
  ON public.league_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.competitive_leagues l
      WHERE l.id = league_entries.league_id
        AND public.has_club_role(
          l.club_id,
          ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.competitive_leagues l
      WHERE l.id = league_entries.league_id
        AND public.has_club_role(
          l.club_id,
          ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
        )
    )
  );

DROP POLICY IF EXISTS "league_results_select_all" ON public.league_results;
CREATE POLICY "league_results_select_all"
  ON public.league_results FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "league_results_manage_staff" ON public.league_results;
CREATE POLICY "league_results_manage_staff"
  ON public.league_results FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.competitive_leagues l
      WHERE l.id = league_results.league_id
        AND public.has_club_role(
          l.club_id,
          ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.competitive_leagues l
      WHERE l.id = league_results.league_id
        AND public.has_club_role(
          l.club_id,
          ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
        )
    )
  );

DROP POLICY IF EXISTS "league_movements_select_all" ON public.league_movements;
CREATE POLICY "league_movements_select_all"
  ON public.league_movements FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "league_movements_manage_staff" ON public.league_movements;
CREATE POLICY "league_movements_manage_staff"
  ON public.league_movements FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.competitive_leagues l
      WHERE l.id = league_movements.league_id
        AND public.has_club_role(
          l.club_id,
          ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.competitive_leagues l
      WHERE l.id = league_movements.league_id
        AND public.has_club_role(
          l.club_id,
          ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
        )
    )
  );

COMMENT ON TABLE public.competitive_leagues IS
  'Championnat saisonnier par club — divisions avec montée / descente.';
COMMENT ON TABLE public.league_divisions IS
  'Division (D1 = level_order 1, la plus haute).';
COMMENT ON TABLE public.league_movements IS
  'Historique des mouvements inter-divisions en fin de saison.';
