-- KIFPADEL V1 tournaments: single-elimination, one category per tournament.
-- Fixes profiles.id usage in ELO trigger + stats init (was still user_id from older schema).

-- ---------------------------------------------------------------------------
-- Align player stats trigger with profiles.id
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_player_stats()
returns trigger as $$
begin
  insert into public.player_stats (player_id) values (new.id) on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- process_match_result: use profiles.id (not user_id)
-- ---------------------------------------------------------------------------
create or replace function public.process_match_result()
returns trigger as $$
declare
  team_a_players uuid[];
  team_b_players uuid[];
  team_a_avg_rating numeric;
  team_b_avg_rating numeric;
  expected_a numeric;
  rating_change integer;
  k_factor integer := 32;
  p_id uuid;
  p_rating integer;
  p_new_rating integer;
  p_streak integer;
  p_best_streak integer;
  p_wins integer;
  p_matches integer;
begin
  select array_agg(player_id) into team_a_players
  from public.match_participants where match_id = new.match_id and team = 'A';
  select array_agg(player_id) into team_b_players
  from public.match_participants where match_id = new.match_id and team = 'B';

  select coalesce(avg(sport_rating), 1200) into team_a_avg_rating
  from public.profiles
  where id = any(team_a_players);

  select coalesce(avg(sport_rating), 1200) into team_b_avg_rating
  from public.profiles
  where id = any(team_b_players);

  expected_a := 1.0 / (1.0 + power(10.0, (team_b_avg_rating - team_a_avg_rating) / 400.0));

  if new.winner_team = 'A' then
    rating_change := round(k_factor * (1.0 - expected_a));
  else
    rating_change := round(k_factor * (0.0 - expected_a));
  end if;

  if team_a_players is not null then
    foreach p_id in array team_a_players
    loop
      select sport_rating into p_rating from public.profiles where id = p_id;
      p_new_rating := p_rating + rating_change;
      update public.profiles set sport_rating = p_new_rating where id = p_id;
      insert into public.player_rating_events (player_id, match_id, old_rating, new_rating, rating_change)
      values (p_id, new.match_id, p_rating, p_new_rating, rating_change);
      select current_streak, best_win_streak, wins, matches_played into p_streak, p_best_streak, p_wins, p_matches
      from public.player_stats where player_id = p_id;
      p_matches := p_matches + 1;
      if new.winner_team = 'A' then
        p_wins := p_wins + 1;
        if p_streak < 0 then p_streak := 1; else p_streak := p_streak + 1; end if;
        if p_streak > p_best_streak then p_best_streak := p_streak; end if;
      else
        if p_streak > 0 then p_streak := -1; else p_streak := p_streak - 1; end if;
      end if;
      update public.player_stats
      set
        matches_played = p_matches,
        wins = p_wins,
        losses = p_matches - p_wins,
        win_rate = round((p_wins::numeric / p_matches::numeric) * 100, 2),
        current_streak = p_streak,
        best_win_streak = p_best_streak,
        updated_at = now()
      where player_id = p_id;
    end loop;
  end if;

  if team_b_players is not null then
    foreach p_id in array team_b_players
    loop
      select sport_rating into p_rating from public.profiles where id = p_id;
      p_new_rating := p_rating - rating_change;
      update public.profiles set sport_rating = p_new_rating where id = p_id;
      insert into public.player_rating_events (player_id, match_id, old_rating, new_rating, rating_change)
      values (p_id, new.match_id, p_rating, p_new_rating, -rating_change);
      select current_streak, best_win_streak, wins, matches_played into p_streak, p_best_streak, p_wins, p_matches
      from public.player_stats where player_id = p_id;
      p_matches := p_matches + 1;
      if new.winner_team = 'B' then
        p_wins := p_wins + 1;
        if p_streak < 0 then p_streak := 1; else p_streak := p_streak + 1; end if;
        if p_streak > p_best_streak then p_best_streak := p_streak; end if;
      else
        if p_streak > 0 then p_streak := -1; else p_streak := p_streak - 1; end if;
      end if;
      update public.player_stats
      set
        matches_played = p_matches,
        wins = p_wins,
        losses = p_matches - p_wins,
        win_rate = round((p_wins::numeric / p_matches::numeric) * 100, 2),
        current_streak = p_streak,
        best_win_streak = p_best_streak,
        updated_at = now()
      where player_id = p_id;
    end loop;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  description text,
  format text not null default 'knockout' check (format = 'knockout'),
  status text not null default 'draft' check (
    status in ('draft', 'registration_open', 'in_progress', 'completed', 'cancelled')
  ),
  entry_fee_cents integer,
  starts_at timestamptz,
  ends_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tournaments_club_id_idx on public.tournaments (club_id);
create index if not exists tournaments_status_idx on public.tournaments (status);

create table if not exists public.tournament_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  team_name text,
  player1_id uuid not null references public.profiles (id) on delete cascade,
  player2_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'withdrawn', 'checked_in')),
  seed integer,
  created_at timestamptz not null default now(),
  constraint tournament_entries_distinct_players check (player1_id <> player2_id)
);

create index if not exists tournament_entries_tournament_id_idx on public.tournament_entries (tournament_id);

create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  round text not null,
  position integer not null,
  match_id uuid references public.matches (id) on delete cascade,
  team1_entry_id uuid references public.tournament_entries (id) on delete set null,
  team2_entry_id uuid references public.tournament_entries (id) on delete set null,
  scheduled_starts_at timestamptz,
  court_id uuid references public.courts (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint tournament_matches_round_position_unique unique (tournament_id, round, position)
);

create unique index if not exists tournament_matches_match_id_uidx
  on public.tournament_matches (match_id)
  where match_id is not null;

create index if not exists tournament_matches_tournament_id_idx on public.tournament_matches (tournament_id);

-- When a tournament is deleted, remove underlying matches first (cleanup FK graph).
create or replace function public.tournament_before_delete_cleanup_matches()
returns trigger as $$
begin
  delete from public.matches m
  using public.tournament_matches tm
  where tm.tournament_id = old.id
    and tm.match_id is not null
    and m.id = tm.match_id;
  return old;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists tournament_before_delete_cleanup_matches on public.tournaments;
create trigger tournament_before_delete_cleanup_matches
  before delete on public.tournaments
  for each row execute function public.tournament_before_delete_cleanup_matches();

create or replace function public.set_tournaments_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tournaments_set_updated_at on public.tournaments;
create trigger tournaments_set_updated_at
  before update on public.tournaments
  for each row execute function public.set_tournaments_updated_at();

-- Optional: ensure entries attached to a tournament row belong to that tournament (defensive)
create or replace function public.tournament_matches_entries_same_tournament()
returns trigger as $$
begin
  if new.team1_entry_id is not null then
    if not exists (
      select 1 from public.tournament_entries e
      where e.id = new.team1_entry_id and e.tournament_id = new.tournament_id
    ) then
      raise exception 'team1_entry_id must belong to tournament';
    end if;
  end if;
  if new.team2_entry_id is not null then
    if not exists (
      select 1 from public.tournament_entries e
      where e.id = new.team2_entry_id and e.tournament_id = new.tournament_id
    ) then
      raise exception 'team2_entry_id must belong to tournament';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists tournament_matches_entries_same_tournament on public.tournament_matches;
create trigger tournament_matches_entries_same_tournament
  before insert or update on public.tournament_matches
  for each row execute function public.tournament_matches_entries_same_tournament();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.tournaments enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.tournament_matches enable row level security;

-- Tournaments: public read (discovery); staff manage their club
drop policy if exists "tournaments_select_all" on public.tournaments;
create policy "tournaments_select_all"
  on public.tournaments for select
  using (true);

drop policy if exists "tournaments_insert_staff" on public.tournaments;
create policy "tournaments_insert_staff"
  on public.tournaments for insert
  with check (
    created_by = auth.uid()
    and public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin'])
  );

drop policy if exists "tournaments_update_staff" on public.tournaments;
create policy "tournaments_update_staff"
  on public.tournaments for update
  using (public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin']))
  with check (public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin']));

drop policy if exists "tournaments_delete_staff" on public.tournaments;
create policy "tournaments_delete_staff"
  on public.tournaments for delete
  using (public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin']));

-- Entries: readable; players insert when they are player1; staff full
drop policy if exists "tournament_entries_select_all" on public.tournament_entries;
create policy "tournament_entries_select_all"
  on public.tournament_entries for select
  using (true);

drop policy if exists "tournament_entries_insert_self_player1" on public.tournament_entries;
create policy "tournament_entries_insert_self_player1"
  on public.tournament_entries for insert
  with check (
    player1_id = auth.uid()
    and exists (
      select 1 from public.tournaments t
      where t.id = tournament_id
        and t.status = 'registration_open'
    )
  );

drop policy if exists "tournament_entries_manage_staff" on public.tournament_entries;
create policy "tournament_entries_manage_staff"
  on public.tournament_entries for all
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_entries.tournament_id
        and public.has_club_role(t.club_id, array['club_staff', 'club_manager', 'platform_admin'])
    )
  )
  with check (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_entries.tournament_id
        and public.has_club_role(t.club_id, array['club_staff', 'club_manager', 'platform_admin'])
    )
  );

-- tournament_entries_manage_staff conflicts with insert_self - PostgreSQL unions policies with OR
-- Staff needs insert without being player1: covered by manage_staff for ALL

drop policy if exists "tournament_matches_select_all" on public.tournament_matches;
create policy "tournament_matches_select_all"
  on public.tournament_matches for select
  using (true);

drop policy if exists "tournament_matches_write_staff" on public.tournament_matches;
create policy "tournament_matches_write_staff"
  on public.tournament_matches for all
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_matches.tournament_id
        and public.has_club_role(t.club_id, array['club_staff', 'club_manager', 'platform_admin'])
    )
  )
  with check (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_matches.tournament_id
        and public.has_club_role(t.club_id, array['club_staff', 'club_manager', 'platform_admin'])
    )
  );

-- Allow club staff to register participants on club matches (tournament bracket generation)
drop policy if exists "match_participants_insert_club_staff" on public.match_participants;

create policy "match_participants_insert_club_staff"
  on public.match_participants for insert
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.club_id is not null
        and public.has_club_role(m.club_id, array['club_staff', 'club_manager', 'platform_admin'])
    )
  );

-- Participants can read matches they play in (incl. statut « played » après résultat tournoi)
drop policy if exists "matches_select_if_participant" on public.matches;
create policy "matches_select_if_participant"
  on public.matches for select
  using (
    exists (
      select 1 from public.match_participants mp
      where mp.match_id = matches.id
        and mp.player_id = auth.uid()
    )
  );
