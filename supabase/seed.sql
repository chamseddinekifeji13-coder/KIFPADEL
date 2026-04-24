-- Seed data for local functional smoke tests.
insert into public.clubs (id, name, city, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'Kif Padel Tunis', 'Tunis', true),
  ('22222222-2222-2222-2222-222222222222', 'Kif Padel Sousse', 'Sousse', true)
on conflict (id) do nothing;

insert into public.courts (id, club_id, label, surface, is_indoor)
values
  ('11111111-aaaa-1111-aaaa-111111111111', '11111111-1111-1111-1111-111111111111', 'Court 1', 'panoramic', false),
  ('22222222-bbbb-2222-bbbb-222222222222', '11111111-1111-1111-1111-111111111111', 'Court 2', 'standard', true)
on conflict (id) do nothing;
