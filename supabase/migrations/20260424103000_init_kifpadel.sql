create extension if not exists "uuid-ossp";

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
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  city text not null default 'Tunis',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.club_memberships (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'player',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (club_id, player_id)
);

create table if not exists public.courts (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  label text not null,
  surface text not null default 'standard',
  is_indoor boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.time_slots (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null default 4,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
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
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.trust_events (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  delta integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.member_cards (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid not null unique references auth.users(id) on delete cascade,
  qr_code_value text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles add constraint profiles_main_club_fk
  foreign key (main_club_id) references public.clubs(id) on delete set null;

create or replace function public.has_club_role(target_club_id uuid, allowed_roles text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.club_memberships cm
    where cm.club_id = target_club_id
      and cm.player_id = auth.uid()
      and cm.role = any(allowed_roles)
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.club_memberships cm
    where cm.player_id = auth.uid()
      and cm.role = 'platform_admin'
  );
$$;

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

create policy "profiles_select_self"
  on public.profiles for select
  using (auth.uid() = user_id or public.is_platform_admin());

create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = user_id or public.is_platform_admin())
  with check (auth.uid() = user_id or public.is_platform_admin());

create policy "clubs_public_read"
  on public.clubs for select
  using (is_active = true or public.is_platform_admin());

create policy "club_memberships_select_self_or_admin"
  on public.club_memberships for select
  using (player_id = auth.uid() or public.is_platform_admin());

create policy "courts_select_by_membership"
  on public.courts for select
  using (
    public.has_club_role(club_id, array['player', 'club_staff', 'club_manager', 'platform_admin'])
    or public.is_platform_admin()
  );

create policy "courts_manage_by_staff"
  on public.courts for all
  using (public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin']))
  with check (public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin']));

create policy "time_slots_select_by_membership"
  on public.time_slots for select
  using (
    public.has_club_role(club_id, array['player', 'club_staff', 'club_manager', 'platform_admin'])
    or public.is_platform_admin()
  );

create policy "time_slots_manage_by_staff"
  on public.time_slots for all
  using (public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin']))
  with check (public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin']));

create policy "bookings_select_owner_or_staff"
  on public.bookings for select
  using (
    created_by = auth.uid()
    or public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin'])
  );

create policy "bookings_insert_owner"
  on public.bookings for insert
  with check (created_by = auth.uid());

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

create policy "matches_read_open_or_member"
  on public.matches for select
  using (
    status = 'open'
    or created_by = auth.uid()
    or (club_id is not null and public.has_club_role(club_id, array['player', 'club_staff', 'club_manager', 'platform_admin']))
  );

create policy "matches_insert_owner"
  on public.matches for insert
  with check (created_by = auth.uid());

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

create policy "match_participants_insert_self"
  on public.match_participants for insert
  with check (player_id = auth.uid());

create policy "match_results_select"
  on public.match_results for select
  using (true);

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

create policy "incidents_select_club_staff"
  on public.incidents for select
  using (
    public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin'])
    or player_id = auth.uid()
  );

create policy "incidents_insert_club_staff"
  on public.incidents for insert
  with check (
    created_by = auth.uid()
    and public.has_club_role(club_id, array['club_staff', 'club_manager', 'platform_admin'])
  );

create policy "trust_events_select_self_or_staff"
  on public.trust_events for select
  using (
    player_id = auth.uid()
    or public.is_platform_admin()
  );

create policy "trust_events_insert_staff"
  on public.trust_events for insert
  with check (public.is_platform_admin());

create policy "member_cards_select_self_or_staff"
  on public.member_cards for select
  using (
    player_id = auth.uid()
    or public.is_platform_admin()
  );

create policy "member_cards_upsert_staff"
  on public.member_cards for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
