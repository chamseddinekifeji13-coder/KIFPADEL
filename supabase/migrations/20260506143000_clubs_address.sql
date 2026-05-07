-- Adresse postale précise pour itinéraires (Google Maps, etc.)

alter table public.clubs
  add column if not exists address text;

comment on column public.clubs.address is 'Adresse complète du club (rue, quartier…) pour la navigation ; optionnel.';
