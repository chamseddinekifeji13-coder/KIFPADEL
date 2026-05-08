-- UUID defaults: Supabase-managed PG (17+) — use pgcrypto-backed random UUIDs
-- instead of uuid-ossp/uuid_generate_v4(), which are not enabled by default on Supabase PG 17+.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  phone text,
  city text default 'Tunis',
  main_club_id uuid,
  sport_rating integer not null default 1200,
  league text not null default 'bronze',
  trust_score integer not null default 70,
  reliability_status text not null default 'healthy',
  verification_level smallint not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null default 'Tunis',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'player',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  label text not null,
  surface text not null default 'standard',
  is_indoor boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.time_slots (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null default 4,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.match_participants (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  team text not null,
  joined_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

create table if not exists public.match_results (
  match_id uuid primary key references public.matches(id) on delete cascade,
  winner_team text not null,
  validated_at timestamptz not null default now(),
  validated_by uuid not null references auth.users(id) on delete cascade
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.trust_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  delta integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.member_cards (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null unique references auth.users(id) on delete cascade,
  qr_code_value text not null unique,
  created_at timestamptz not null default now()
);

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_main_club_fk'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_main_club_fk
      foreign key (main_club_id) references public.clubs(id) on delete set null;
  end if;
end $migration$;

-- Resolves legacy `player_id` vs current `user_id` on club_memberships (partially migrated DBs).
create or replace function public.has_club_role(target_club_id uuid, allowed_roles text[])
returns boolean
language plpgsql
stable
set search_path = public
as $fn$
declare
  member_col text;
  result boolean;
begin
  select c.column_name into member_col
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'club_memberships'
    and c.column_name in ('user_id', 'player_id')
  order by case c.column_name when 'user_id' then 0 else 1 end
  limit 1;

  if member_col is null then
    return false;
  end if;

  execute format(
    $q$
      select exists (
        select 1 from public.club_memberships cm
        where cm.club_id = $1
          and cm.%I = auth.uid()
          and cm.role::text = any ($2::text[])
      )
    $q$,
    member_col
  ) into result using target_club_id, allowed_roles;

  return coalesce(result, false);
end;
$fn$;

create or replace function public.is_platform_admin()
returns boolean
language plpgsql
stable
set search_path = public
as $fn$
declare
  member_col text;
  result boolean;
begin
  select c.column_name into member_col
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'club_memberships'
    and c.column_name in ('user_id', 'player_id')
  order by case c.column_name when 'user_id' then 0 else 1 end
  limit 1;

  if member_col is null then
    return false;
  end if;

  execute format(
    $q$
      select exists (
        select 1 from public.club_memberships cm
        where cm.%I = auth.uid()
          and cm.role::text = 'platform_admin'
      )
    $q$,
    member_col
  ) into result;

  return coalesce(result, false);
end;
$fn$;

alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.club_memberships enable row level security;
alter table public.courts enable row level security;
alter table public.time_slots enable row level security;
alter table public.bookings enable row level security;
alter table public.matches enable row level security;
alter table public.match_participants enable row level security;
alter table public.match_results enable row level security;
alter table public.incidents enable row level security;
alter table public.trust_events enable row level security;
alter table public.member_cards enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
do $profiles_policies$
declare
  pk_col text;
begin
  select c.column_name into pk_col
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'profiles'
    and c.column_name in ('id', 'user_id')
  order by case c.column_name when 'id' then 0 else 1 end
  limit 1;

  if pk_col is null then
    raise exception 'init_kifpadel: profiles PK column id/user_id missing';
  end if;

  execute format(
    $q$
      create policy "profiles_select_self"
        on public.profiles for select
        using (auth.uid() = %I or public.is_platform_admin())
    $q$,
    pk_col
  );

  execute format(
    $q$
      create policy "profiles_update_self"
        on public.profiles for update
        using (auth.uid() = %I or public.is_platform_admin())
        with check (auth.uid() = %I or public.is_platform_admin())
    $q$,
    pk_col,
    pk_col
  );
end $profiles_policies$;

drop policy if exists "clubs_public_read" on public.clubs;
create policy "clubs_public_read"
  on public.clubs for select
  using (is_active = true or public.is_platform_admin());

drop policy if exists "club_memberships_select_self_or_admin" on public.club_memberships;
do $policy$
declare
  member_col text;
begin
  select c.column_name into member_col
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'club_memberships'
    and c.column_name in ('user_id', 'player_id')
  order by case c.column_name when 'user_id' then 0 else 1 end
  limit 1;

  if member_col is not null then
    execute format(
      $q$
        create policy "club_memberships_select_self_or_admin"
          on public.club_memberships for select
          using (%I = auth.uid() or public.is_platform_admin())
      $q$,
      member_col
    );
  end if;
end $policy$;

drop policy if exists "courts_select_by_membership" on public.courts;
create policy "courts_select_by_membership"
  on public.courts for select
  using (
    public.has_club_role(club_id, array['player', 'club_staff', 'club_manager', 'platform_admin'])
    or public.is_platform_admin()
  );

drop policy if exists "courts_manage_by_staff" on public.courts;
create policy "courts_manage_by_staff"
  on public.courts for all
  using (public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin']))
  with check (public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin']));

drop policy if exists "time_slots_select_by_membership" on public.time_slots;
create policy "time_slots_select_by_membership"
  on public.time_slots for select
  using (
    public.has_club_role(club_id, array['player', 'club_staff', 'club_manager', 'platform_admin'])
    or public.is_platform_admin()
  );

drop policy if exists "time_slots_manage_by_staff" on public.time_slots;
create policy "time_slots_manage_by_staff"
  on public.time_slots for all
  using (public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin']))
  with check (public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin']));

drop policy if exists "bookings_select_owner_or_staff" on public.bookings;
create policy "bookings_select_owner_or_staff"
  on public.bookings for select
  using (
    created_by = auth.uid()
    or public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin'])
  );

drop policy if exists "bookings_insert_owner" on public.bookings;
create policy "bookings_insert_owner"
  on public.bookings for insert
  with check (created_by = auth.uid());

drop policy if exists "bookings_update_owner_or_staff" on public.bookings;
create policy "bookings_update_owner_or_staff"
  on public.bookings for update
  using (
    created_by = auth.uid()
    or public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin'])
  )
  with check (
    created_by = auth.uid()
    or public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin'])
  );

drop policy if exists "matches_read_open_or_member" on public.matches;
create policy "matches_read_open_or_member"
  on public.matches for select
  using (
    status = 'open'
    or created_by = auth.uid()
    or (club_id is not null and public.has_club_role(club_id, array['player', 'club_staff', 'club_manager', 'platform_admin']))
  );

drop policy if exists "matches_insert_owner" on public.matches;
create policy "matches_insert_owner"
  on public.matches for insert
  with check (created_by = auth.uid());

drop policy if exists "matches_update_owner_or_staff" on public.matches;
create policy "matches_update_owner_or_staff"
  on public.matches for update
  using (
    created_by = auth.uid()
    or (club_id is not null and public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin']))
  )
  with check (
    created_by = auth.uid()
    or (club_id is not null and public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin']))
  );

drop policy if exists "match_participants_select_match_members" on public.match_participants;
create policy "match_participants_select_match_members"
  on public.match_participants for select
  using (
    player_id = auth.uid()
    or exists (
      select 1
      from public.matches m
      where m.id = match_id
        and (
          m.created_by = auth.uid()
          or (m.club_id is not null and public.has_club_role(m.club_id, array['club_staff', 'club_manager', 'platform_admin']))
        )
    )
  );

drop policy if exists "match_participants_insert_self" on public.match_participants;
create policy "match_participants_insert_self"
  on public.match_participants for insert
  with check (player_id = auth.uid());

drop policy if exists "match_results_select" on public.match_results;
create policy "match_results_select"
  on public.match_results for select
  using (true);

drop policy if exists "match_results_insert_staff_or_creator" on public.match_results;
create policy "match_results_insert_staff_or_creator"
  on public.match_results for insert
  with check (
    validated_by = auth.uid()
    and exists (
      select 1
      from public.matches m
      where m.id = match_id
        and (
          m.created_by = auth.uid()
          or (m.club_id is not null and public.has_club_role(m.club_id, array['club_staff', 'club_manager', 'platform_admin']))
        )
    )
  );

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

drop policy if exists "trust_events_select_self_or_staff" on public.trust_events;
create policy "trust_events_select_self_or_staff"
  on public.trust_events for select
  using (
    player_id = auth.uid()
    or public.is_platform_admin()
  );

drop policy if exists "trust_events_insert_staff" on public.trust_events;
create policy "trust_events_insert_staff"
  on public.trust_events for insert
  with check (public.is_platform_admin());

drop policy if exists "member_cards_select_self_or_staff" on public.member_cards;
create policy "member_cards_select_self_or_staff"
  on public.member_cards for select
  using (
    player_id = auth.uid()
    or public.is_platform_admin()
  );

drop policy if exists "member_cards_upsert_staff" on public.member_cards;
create policy "member_cards_upsert_staff"
  on public.member_cards for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
