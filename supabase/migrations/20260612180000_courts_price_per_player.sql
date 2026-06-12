-- Phase 1 tarification : prix par joueur (part individuelle sur un créneau padel).

ALTER TABLE public.courts
  ADD COLUMN IF NOT EXISTS price_per_player numeric(10,2);

COMMENT ON COLUMN public.courts.price_per_player IS
  'Prix par joueur en DT pour un créneau (part individuelle). Si null, dérivé de price_per_slot / 4.';

UPDATE public.courts
SET price_per_player = ROUND(price_per_slot / 4.0, 2)
WHERE price_per_player IS NULL
  AND price_per_slot IS NOT NULL
  AND price_per_slot > 0;

UPDATE public.courts
SET price_per_player = 10
WHERE price_per_player IS NULL;
