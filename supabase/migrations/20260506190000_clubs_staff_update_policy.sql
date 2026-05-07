-- Politiques RLS sur `clubs` sans dépendre de `public.has_club_role`
-- (évite ERROR 42883 si la fonction n’existe pas sur le projet ou a une autre signature).
--
-- `id` dans USING / WITH CHECK désigne la ligne courante de `clubs` (PK du club).

drop policy if exists "clubs_select_by_membership" on public.clubs;

create policy "clubs_select_by_membership"
  on public.clubs for select
  using (
    id in (
      select cm.club_id
      from public.club_memberships cm
      where cm.user_id = auth.uid()
        and cm.role::text = any (
          array['player', 'club_staff', 'club_manager', 'platform_admin']::text[]
        )
    )
  );

drop policy if exists "clubs_update_staff" on public.clubs;

create policy "clubs_update_staff"
  on public.clubs for update
  using (
    id in (
      select cm.club_id
      from public.club_memberships cm
      where cm.user_id = auth.uid()
        and cm.role::text = any (
          array['club_staff', 'club_manager', 'platform_admin']::text[]
        )
    )
  )
  with check (
    id in (
      select cm.club_id
      from public.club_memberships cm
      where cm.user_id = auth.uid()
        and cm.role::text = any (
          array['club_staff', 'club_manager', 'platform_admin']::text[]
        )
    )
  );
