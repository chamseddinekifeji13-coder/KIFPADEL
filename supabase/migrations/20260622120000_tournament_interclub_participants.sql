-- Tournois inter-clubs : clubs participants + club représenté par équipe/joueur.

alter table public.tournament_entries
  add column if not exists representing_club_id uuid references public.clubs (id) on delete set null;

alter table public.tournament_solo_entries
  add column if not exists representing_club_id uuid references public.clubs (id) on delete set null;

create table if not exists public.tournament_participating_clubs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  club_id uuid not null references public.clubs (id) on delete cascade,
  role text not null default 'invited' check (role in ('host', 'invited')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint tournament_participating_clubs_unique unique (tournament_id, club_id)
);

create index if not exists tournament_participating_clubs_tournament_id_idx
  on public.tournament_participating_clubs (tournament_id);

create index if not exists tournament_participating_clubs_club_id_idx
  on public.tournament_participating_clubs (club_id);

alter table public.tournament_participating_clubs enable row level security;

drop policy if exists "tournament_participating_clubs_select_all" on public.tournament_participating_clubs;
create policy "tournament_participating_clubs_select_all"
  on public.tournament_participating_clubs for select
  using (true);

drop policy if exists "tournament_participating_clubs_insert_host_staff" on public.tournament_participating_clubs;
create policy "tournament_participating_clubs_insert_host_staff"
  on public.tournament_participating_clubs for insert
  with check (
    exists (
      select 1
      from public.tournaments t
      where t.id = tournament_id
        and (
          public.is_super_admin()
          or public.has_club_role(
            t.club_id,
            array['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
          )
        )
    )
  );

drop policy if exists "tournament_participating_clubs_update_invited_staff" on public.tournament_participating_clubs;
create policy "tournament_participating_clubs_update_invited_staff"
  on public.tournament_participating_clubs for update
  using (
    public.is_super_admin()
    or public.has_club_role(
      club_id,
      array['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
    )
    or exists (
      select 1
      from public.tournaments t
      where t.id = tournament_id
        and public.has_club_role(
          t.club_id,
          array['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
        )
    )
  )
  with check (
    public.is_super_admin()
    or public.has_club_role(
      club_id,
      array['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
    )
    or exists (
      select 1
      from public.tournaments t
      where t.id = tournament_id
        and public.has_club_role(
          t.club_id,
          array['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
        )
    )
  );

-- Staff club hôte : tournois single_club OU interclub dont il est l'hôte.
drop policy if exists "tournaments_insert_staff" on public.tournaments;
create policy "tournaments_insert_staff"
  on public.tournaments for insert
  with check (
    created_by = auth.uid()
    and tournament_scope in ('single_club', 'interclub')
    and public.has_club_role(
      club_id,
      array['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
    )
  );
