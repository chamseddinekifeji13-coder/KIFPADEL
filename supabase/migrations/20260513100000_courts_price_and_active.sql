-- Sprint 1 P0 — Migration 1/6
-- Ajouter price_per_slot et is_active sur courts.
-- Le code (availability-service.ts, clubs/repository.ts) lit déjà ces colonnes.

ALTER TABLE public.courts
  ADD COLUMN IF NOT EXISTS price_per_slot numeric(10,2) DEFAULT 40,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.courts.price_per_slot IS 'Prix par créneau en DT. Défaut 40 DT.';
COMMENT ON COLUMN public.courts.is_active IS 'Terrain actif (true) ou en maintenance/fermé (false).';
