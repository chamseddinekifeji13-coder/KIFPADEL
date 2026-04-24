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

-- Sample Profiles
insert into public.profiles (user_id, display_name, email, league, trust_rating)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ahmed Padel', 'ahmed@example.com', 'Gold', 98.5),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sarra K.', 'sarra@example.com', 'Silver', 95.0),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Mohamed B.', 'mohamed@example.com', 'Bronze', 88.0)
on conflict (user_id) do nothing;

-- Sample Open Matches
insert into public.matches (id, club_id, court_id, starts_at, status, price_per_player)
values
  ('m1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '11111111-aaaa-1111-aaaa-111111111111', now() + interval '2 hours', 'open', 25.0),
  ('m2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '22222222-bbbb-2222-bbbb-222222222222', now() + interval '5 hours', 'open', 20.0),
  ('m3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '22222222-bbbb-2222-bbbb-222222222222', now() + interval '1 day', 'open', 30.0)
on conflict (id) do nothing;

-- Sample Match Participation
insert into public.match_players (match_id, player_id, team_side)
values
  ('m1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A'),
  ('m1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B'),
  ('m2222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'A')
on conflict (match_id, player_id) do nothing;

