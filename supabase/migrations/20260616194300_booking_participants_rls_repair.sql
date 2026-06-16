-- Réparation RLS booking_participants si la migration phase2 a échoué (policy tronquée dans le SQL editor).
-- Safe à ré-exécuter.

alter table public.booking_participants enable row level security;

drop policy if exists "booking_participants_select_own_or_staff" on public.booking_participants;
create policy "booking_participants_select_own_or_staff"
  on public.booking_participants for select
  using (
    player_id = auth.uid()
    or public.has_club_role(
      (select b.club_id from public.bookings b where b.id = booking_id),
      array['club_staff', 'club_manager', 'club_admin', 'platform_admin']
    )
  );

drop policy if exists "booking_participants_insert_own" on public.booking_participants;
create policy "booking_participants_insert_own"
  on public.booking_participants for insert
  with check (player_id = auth.uid());

-- Policy partielle si un run précédent a coupé le nom au milieu
drop policy if exists "booking_participants_update_st" on public.booking_participants;

drop policy if exists "booking_participants_update_staff" on public.booking_participants;
create policy "booking_participants_update_staff"
  on public.booking_participants for update
  using (
    public.has_club_role(
      (select b.club_id from public.bookings b where b.id = booking_id),
      array['club_staff', 'club_manager', 'club_admin', 'platform_admin']
    )
  );
