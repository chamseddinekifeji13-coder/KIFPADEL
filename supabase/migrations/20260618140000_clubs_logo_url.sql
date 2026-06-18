-- Logo club (URL HTTPS) affiché sur les cartes liste / réservation.

alter table public.clubs
  add column if not exists logo_url text;

comment on column public.clubs.logo_url is
  'URL HTTPS du logo club (Supabase Storage, CDN ou site du club).';
