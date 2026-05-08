-- club_admin peut gérer les terrains (aligné avec les actions applicatives staff).
drop policy if exists "courts_manage_by_staff" on public.courts;

create policy "courts_manage_by_staff"
  on public.courts for all
  using (public.has_club_role(club_id, array['club_staff', 'club_manager', 'club_admin', 'platform_admin']))
  with check (public.has_club_role(club_id, array['club_staff', 'club_manager', 'club_admin', 'platform_admin']));
