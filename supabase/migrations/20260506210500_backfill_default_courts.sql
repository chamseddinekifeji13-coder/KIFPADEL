-- Ensure every club has at least one court so booking slots can be selected.
-- Older / customized DBs may use `name` instead of `label`.
DO $bf$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'courts'
      AND column_name = 'label'
  ) THEN
    INSERT INTO public.courts (club_id, label, surface, is_indoor)
    SELECT c.id, 'Terrain 1', 'standard', false
    FROM public.clubs c
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.courts court
      WHERE court.club_id = c.id
    );
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'courts'
      AND column_name = 'name'
  ) THEN
    INSERT INTO public.courts (club_id, name, surface, is_indoor)
    SELECT c.id, 'Terrain 1', 'standard', false
    FROM public.clubs c
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.courts court
      WHERE court.club_id = c.id
    );
  ELSE
    RAISE NOTICE 'backfill_default_courts: courts has neither label nor name; skipped';
  END IF;
END $bf$;
