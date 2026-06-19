-- Chat intégré pour les matchs ouverts.

CREATE TABLE IF NOT EXISTS public.match_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_messages_match_created
  ON public.match_messages (match_id, created_at DESC);

COMMENT ON TABLE public.match_messages IS
  'Fil de discussion entre participants d''un match ouvert (coordination avant le créneau).';

CREATE OR REPLACE FUNCTION public.can_access_match_chat(p_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = p_match_id
      AND (
        m.created_by = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.match_participants mp
          WHERE mp.match_id = p_match_id
            AND mp.player_id = auth.uid()
            AND coalesce(mp.status, 'pending') NOT IN ('declined', 'cancelled')
        )
        OR (
          m.club_id IS NOT NULL
          AND public.has_club_role(
            m.club_id,
            ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']
          )
        )
      )
  );
$$;

ALTER TABLE public.match_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_messages_select" ON public.match_messages;
CREATE POLICY "match_messages_select"
  ON public.match_messages
  FOR SELECT
  USING (public.can_access_match_chat(match_id));

DROP POLICY IF EXISTS "match_messages_insert" ON public.match_messages;
CREATE POLICY "match_messages_insert"
  ON public.match_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.can_access_match_chat(match_id)
  );

-- Realtime : nouveaux messages visibles sans refresh.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'match_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.match_messages;
    END IF;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.can_access_match_chat(uuid) TO authenticated;
