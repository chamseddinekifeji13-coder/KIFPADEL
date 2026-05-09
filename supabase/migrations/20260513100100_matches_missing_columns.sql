-- Sprint 1 P0 — Migration 2/6
-- Ajouter les colonnes utilisées par le code et le seed mais absentes du schéma.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS court_id uuid REFERENCES public.courts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS price_per_player numeric(10,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS matches_court_id_idx ON public.matches(court_id);

COMMENT ON COLUMN public.matches.court_id IS 'Terrain assigné au match (facultatif pour open matches).';
COMMENT ON COLUMN public.matches.ends_at IS 'Heure de fin du match.';
COMMENT ON COLUMN public.matches.price_per_player IS 'Part joueur en DT.';
