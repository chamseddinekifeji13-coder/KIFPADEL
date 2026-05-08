-- Repair / idempotent bootstrap for public.incidents.
-- Some remote DBs skipped or partially applied 20260424103000_init_kifpadel.sql
-- but later migrations (e.g. super_admin RLS) reference this table.
-- Safe to run if the table already exists (CREATE TABLE IF NOT EXISTS).

create extension if not exists "uuid-ossp";

create table if not exists public.incidents (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.incidents enable row level security;

drop policy if exists "incidents_select_club_staff" on public.incidents;
create policy "incidents_select_club_staff"
  on public.incidents for select
  using (
    public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin'])
    or player_id = auth.uid()
  );

drop policy if exists "incidents_insert_club_staff" on public.incidents;
create policy "incidents_insert_club_staff"
  on public.incidents for insert
  with check (
    created_by = auth.uid()
    and public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin'])
  );
