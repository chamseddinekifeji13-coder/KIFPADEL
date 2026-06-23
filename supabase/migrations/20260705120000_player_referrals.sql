-- Parrainage joueur : qui a invité ce profil à rejoindre Kifpadel.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_referred_by_user_id_idx
  ON public.profiles (referred_by_user_id)
  WHERE referred_by_user_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.referred_by_user_id IS
  'Joueur parrain (lien inscription ?ref=). Renseigné une seule fois à la création du compte.';
