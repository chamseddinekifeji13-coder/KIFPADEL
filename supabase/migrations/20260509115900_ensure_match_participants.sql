-- Some hosted DBs were provisioned without 20260424103000_init or use legacy `match_players` only.
-- This migration ensures `public.match_participants` exists before gender / RLS updates.

create table if not exists public.match_participants (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references auth.users (id) on delete cascade,
  team text not null,
  joined_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

create index if not exists match_participants_match_id_idx on public.match_participants (match_id);
create index if not exists match_participants_player_id_idx on public.match_participants (player_id);

-- Backfill from match_players when present (team_side or team column).
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'match_players'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'match_players' and column_name = 'team_side'
    ) then
      insert into public.match_participants (match_id, player_id, team)
      select
        mp.match_id,
        mp.player_id,
        coalesce(nullif(trim(both from mp.team_side::text), ''), 'A')
      from public.match_players mp
      on conflict (match_id, player_id) do nothing;
    elsif exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'match_players' and column_name = 'team'
    ) then
      insert into public.match_participants (match_id, player_id, team)
      select
        mp.match_id,
        mp.player_id,
        coalesce(nullif(trim(both from mp.team::text), ''), 'A')
      from public.match_players mp
      on conflict (match_id, player_id) do nothing;
    else
      insert into public.match_participants (match_id, player_id, team)
      select mp.match_id, mp.player_id, 'A'
      from public.match_players mp
      on conflict (match_id, player_id) do nothing;
    end if;
  end if;
end $$;

alter table public.match_participants enable row level security;

drop policy if exists "match_participants_insert_self" on public.match_participants;

create policy "match_participants_insert_self"
  on public.match_participants for insert
  with check (player_id = auth.uid());

-- Baseline select policy (expanded in 20260509120000_profile_gender_match_gender_type.sql)
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
          or (
            m.club_id is not null
            and public.has_club_role(m.club_id, array['club_staff', 'club_manager', 'platform_admin'])
          )
        )
    )
  );
