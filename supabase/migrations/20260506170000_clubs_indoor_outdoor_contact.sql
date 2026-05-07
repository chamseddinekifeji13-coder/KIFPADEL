-- Terrains indoor / outdoor (résumé affiché aux joueurs) et contact du responsable

alter table public.clubs
  add column if not exists indoor_courts_count integer not null default 0,
  add column if not exists outdoor_courts_count integer not null default 0,
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text;

comment on column public.clubs.indoor_courts_count is 'Nombre de terrains couverts (valeur indicative pour l’affiche joueur).';
comment on column public.clubs.outdoor_courts_count is 'Nombre de terrains extérieurs (valeur indicative).';
comment on column public.clubs.contact_name is 'Nom du responsable / contact principal du club.';
comment on column public.clubs.contact_phone is 'Téléphone du responsable (affiché aux joueurs si renseigné).';
comment on column public.clubs.contact_email is 'Email du responsable (affiché aux joueurs si renseigné).';
