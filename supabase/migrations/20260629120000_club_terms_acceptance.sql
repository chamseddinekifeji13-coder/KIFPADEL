-- Acceptation charte club à la création (trace légale / conformité).

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text;

COMMENT ON COLUMN public.clubs.terms_accepted_at IS
  'Horodatage d''acceptation de la charte club par le gestionnaire à la création.';
COMMENT ON COLUMN public.clubs.terms_version IS
  'Identifiant de version de la charte acceptée (ex. 2026-06-01).';
