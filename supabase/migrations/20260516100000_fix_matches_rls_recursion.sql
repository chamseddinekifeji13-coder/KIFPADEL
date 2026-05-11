-- Fix infinite recursion between matches and match_participants policies

-- 1. Create a SECURITY DEFINER function to check match participation
CREATE OR REPLACE FUNCTION public.is_match_participant(p_match_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.match_participants
    WHERE match_id = p_match_id AND player_id = auth.uid()
  );
$$;

-- 2. Replace the cyclic policy on `matches`
DROP POLICY IF EXISTS "matches_select_if_participant" ON public.matches;
CREATE POLICY "matches_select_if_participant"
  ON public.matches FOR SELECT
  USING (public.is_match_participant(id));
