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

-- Sample profiles (requires matching auth.users in real env; OK for structure smoke)
insert into public.profiles (id, display_name, email, league, trust_score, gender, sport_rating)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ahmed Padel', 'ahmed@example.com', 'bronze', 85, 'male', 1250),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sarra K.', 'sarra@example.com', 'bronze', 88, 'female', 1200),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Mohamed B.', 'mohamed@example.com', 'bronze', 90, 'male', 1180)
on conflict (id) do nothing;

-- Sample open matches (match_participants is the canonical roster table)
insert into public.matches (id, club_id, court_id, starts_at, status, price_per_player, match_gender_type)
values
  ('m1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '11111111-aaaa-1111-aaaa-111111111111', now() + interval '2 hours', 'open', 25, 'mixed'),
  ('m2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '22222222-bbbb-2222-bbbb-222222222222', now() + interval '5 hours', 'open', 20, 'all'),
  ('m3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '22222222-bbbb-2222-bbbb-222222222222', now() + interval '1 day', 'open', 30, 'men_only')
on conflict (id) do nothing;

insert into public.match_participants (match_id, player_id, team)
values
  ('m1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A'),
  ('m1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B'),
  ('m2222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'A')
on conflict (match_id, player_id) do nothing;
