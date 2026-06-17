-- Participation match ouvert : confirmation + engagement de paiement club.

alter table public.match_participants
  add column if not exists status text not null default 'confirmed',
  add column if not exists share_price numeric(10, 2),
  add column if not exists payment_method text,
  add column if not exists payment_committed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.match_participants
  drop constraint if exists match_participants_status_check;

alter table public.match_participants
  add constraint match_participants_status_check
  check (status in ('pending', 'confirmed', 'declined', 'cancelled'));

comment on column public.match_participants.status is
  'pending = place réservée, en attente confirmation joueur ; confirmed = engagement enregistré.';
comment on column public.match_participants.share_price is
  'Part joueur en DT au moment de l inscription.';
comment on column public.match_participants.payment_method is
  'on_site | online — mode de paiement choisi à la confirmation.';
comment on column public.match_participants.payment_committed_at is
  'Horodatage engagement joueur (confirmer ma participation).';

-- Historique : participants déjà présents = confirmés.
update public.match_participants
set
  status = 'confirmed',
  payment_committed_at = coalesce(payment_committed_at, joined_at),
  updated_at = now()
where status is distinct from 'confirmed'
  and status is distinct from 'declined'
  and status is distinct from 'cancelled';

drop policy if exists "match_participants_update_self" on public.match_participants;

create policy "match_participants_update_self"
  on public.match_participants
  for update
  to authenticated
  using (player_id = auth.uid())
  with check (player_id = auth.uid());

drop policy if exists "match_participants_delete_self_pending" on public.match_participants;

create policy "match_participants_delete_self_pending"
  on public.match_participants
  for delete
  to authenticated
  using (
    player_id = auth.uid()
    and status = 'pending'
  );
