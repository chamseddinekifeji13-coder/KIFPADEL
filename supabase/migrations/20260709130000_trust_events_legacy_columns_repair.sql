-- Réparation schéma legacy trust_events (prod : event_type enum + created_by NOT NULL,
-- triggers n'insèrent que kind + delta + match_id).

CREATE OR REPLACE FUNCTION public.trust_events_before_insert_normalize()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_event_type_udt text;
BEGIN
  SELECT c.udt_name
  INTO v_event_type_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'trust_events'
    AND c.column_name = 'event_type';

  IF v_event_type_udt IS NOT NULL THEN
    IF NEW.event_type IS NULL AND NEW.kind IS NOT NULL THEN
      IF v_event_type_udt = 'trust_event_type' THEN
        NEW.event_type := NEW.kind::public.trust_event_type;
      ELSE
        NEW.event_type := NEW.kind;
      END IF;
    ELSIF NEW.event_type IS NOT NULL AND NEW.kind IS NULL THEN
      NEW.kind := NEW.event_type::text;
    END IF;
  ELSIF NEW.event_type IS NOT NULL AND NEW.kind IS NULL THEN
    NEW.kind := NEW.event_type::text;
  ELSIF NEW.kind IS NOT NULL AND NEW.event_type IS NULL THEN
    NEW.event_type := NEW.kind;
  END IF;

  IF NEW.created_by IS NULL THEN
    NEW.created_by := COALESCE(
      auth.uid(),
      CASE
        WHEN NEW.match_id IS NOT NULL THEN (
          SELECT mr.validated_by
          FROM public.match_results mr
          WHERE mr.match_id = NEW.match_id
          LIMIT 1
        )
        ELSE NULL
      END,
      NEW.player_id
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trust_events_before_insert_normalize() IS
  'Remplit event_type (enum legacy) et created_by pour inserts kind-only.';

DROP TRIGGER IF EXISTS trust_events_before_insert_normalize ON public.trust_events;
CREATE TRIGGER trust_events_before_insert_normalize
  BEFORE INSERT ON public.trust_events
  FOR EACH ROW
  EXECUTE FUNCTION public.trust_events_before_insert_normalize();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trust_events' AND column_name = 'event_type'
      AND udt_name = 'trust_event_type'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trust_events' AND column_name = 'kind'
  ) THEN
    UPDATE public.trust_events
    SET event_type = kind::public.trust_event_type
    WHERE event_type IS NULL
      AND kind IS NOT NULL
      AND kind IN ('no_show', 'late_cancel', 'bad_behavior', 'good_behavior', 'fraud');
    UPDATE public.trust_events
    SET kind = event_type::text
    WHERE kind IS NULL AND event_type IS NOT NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trust_events' AND column_name = 'event_type'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trust_events' AND column_name = 'kind'
  ) THEN
    UPDATE public.trust_events SET event_type = kind WHERE event_type IS NULL AND kind IS NOT NULL;
    UPDATE public.trust_events SET kind = event_type WHERE kind IS NULL AND event_type IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trust_events' AND column_name = 'created_by'
  ) THEN
    UPDATE public.trust_events SET created_by = player_id WHERE created_by IS NULL;
  END IF;
END $$;
