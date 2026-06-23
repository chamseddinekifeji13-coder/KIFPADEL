-- Formats tournoi : knockout (existant), poules (round-robin), americano (solo + rotation).

alter table public.tournaments
  drop constraint if exists tournaments_format_check;

alter table public.tournaments
  add constraint tournaments_format_check
  check (format in ('knockout', 'pools', 'americano'));

create table if not exists public.tournament_solo_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'withdrawn', 'checked_in')),
  americano_points integer not null default 0,
  created_at timestamptz not null default now(),
  constraint tournament_solo_entries_unique_player unique (tournament_id, player_id)
);

create index if not exists tournament_solo_entries_tournament_id_idx
  on public.tournament_solo_entries (tournament_id);

alter table public.tournament_solo_entries enable row level security;

drop policy if exists "tournament_solo_entries_select_all" on public.tournament_solo_entries;
create policy "tournament_solo_entries_select_all"
  on public.tournament_solo_entries for select
  using (true);

drop policy if exists "tournament_solo_entries_insert_self" on public.tournament_solo_entries;
create policy "tournament_solo_entries_insert_self"
  on public.tournament_solo_entries for insert
  with check (
    player_id = auth.uid()
    and exists (
      select 1
      from public.tournaments t
      where t.id = tournament_id
        and t.status = 'registration_open'
        and t.format = 'americano'
    )
  );

drop policy if exists "tournament_solo_entries_manage_staff" on public.tournament_solo_entries;
create policy "tournament_solo_entries_manage_staff"
  on public.tournament_solo_entries for all
  using (
    exists (
      select 1
      from public.tournaments t
      where t.id = tournament_solo_entries.tournament_id
        and public.has_club_role(
          t.club_id,
          array['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
        )
    )
  )
  with check (
    exists (
      select 1
      from public.tournaments t
      where t.id = tournament_solo_entries.tournament_id
        and public.has_club_role(
          t.club_id,
          array['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
        )
    )
  );
