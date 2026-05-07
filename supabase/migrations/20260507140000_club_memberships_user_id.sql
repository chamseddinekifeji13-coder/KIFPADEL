-- Colonne membres club : plusieurs projets Supabase utilisent `user_id` plutôt que `player_id`.
-- Renommage ponctuel si l’init historique a créé `player_id` uniquement.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'club_memberships'
      and column_name = 'player_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'club_memberships'
      and column_name = 'user_id'
  ) then
    alter table public.club_memberships rename column player_id to user_id;
  end if;
end $$;

-- Fonctions RLS utilisées par d’autres politiques : aligner sur `user_id`.

create or replace function public.has_club_role(target_club_id uuid, allowed_roles text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.club_memberships cm
    where cm.club_id = target_club_id
      and cm.user_id = auth.uid()
      and cm.role::text = any(allowed_roles)
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
    where cm.user_id = auth.uid()
      and cm.role::text = 'platform_admin'
  );
$$;

drop policy if exists "club_memberships_select_self_or_admin" on public.club_memberships;

create policy "club_memberships_select_self_or_admin"
  on public.club_memberships for select
  using (user_id = auth.uid() or public.is_platform_admin());
