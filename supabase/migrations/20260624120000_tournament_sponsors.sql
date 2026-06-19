-- Sponsors liés à un tournoi (sélection club hôte à la création).

create table if not exists public.tournament_sponsors (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  sponsor_id uuid not null references public.sponsors (id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint tournament_sponsors_unique unique (tournament_id, sponsor_id)
);

create index if not exists tournament_sponsors_tournament_id_idx
  on public.tournament_sponsors (tournament_id);

create index if not exists tournament_sponsors_sponsor_id_idx
  on public.tournament_sponsors (sponsor_id);

alter table public.tournament_sponsors enable row level security;

drop policy if exists "tournament_sponsors_select_all" on public.tournament_sponsors;
create policy "tournament_sponsors_select_all"
  on public.tournament_sponsors for select
  using (true);

drop policy if exists "tournament_sponsors_insert_host_staff" on public.tournament_sponsors;
create policy "tournament_sponsors_insert_host_staff"
  on public.tournament_sponsors for insert
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

drop policy if exists "tournament_sponsors_delete_host_staff" on public.tournament_sponsors;
create policy "tournament_sponsors_delete_host_staff"
  on public.tournament_sponsors for delete
  using (
    public.is_super_admin()
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
