-- can_access_match_chat lit matches / match_participants : éviter récursion RLS.

ALTER FUNCTION public.can_access_match_chat(uuid) SET row_security TO off;
