-- V1 gender on profiles + match gender mode on matches.
-- Expand RLS so participants on **open** matches are readable (counts + join UX).

alter table public.profiles
  add column if not exists gender text;

alter table public.profiles
  drop constraint if exists profiles_gender_check;

alter table public.profiles
  add constraint profiles_gender_check
  check (gender is null or gender in ('male', 'female'));

alter table public.matches
  add column if not exists match_gender_type text;

update public.matches
set match_gender_type = 'all'
where match_gender_type is null;

alter table public.matches
  alter column match_gender_type set default 'all';

alter table public.matches
  alter column match_gender_type set not null;

alter table public.matches
  drop constraint if exists matches_match_gender_type_check;

alter table public.matches
  add constraint matches_match_gender_type_check
  check (match_gender_type in ('all', 'men_only', 'women_only', 'mixed'));

drop policy if exists "match_participants_select_match_members" on public.match_participants;

create policy "match_participants_select_match_members"
  on public.match_participants for select
  using (
    player_id = auth.uid()
    or exists (
      select 1
      from public.matches m
      where m.id = match_id
        and m.status = 'open'
    )
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

create or replace function public.match_participant_genders(p_match_id uuid)
returns table (player_id uuid, gender text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.gender::text
  from public.match_participants mp
  join public.profiles p on p.id = mp.player_id
  where mp.match_id = p_match_id
    and exists (
      select 1
      from public.matches m
      where m.id = p_match_id
        and m.status = 'open'
    );
$$;

grant execute on function public.match_participant_genders(uuid) to authenticated;
