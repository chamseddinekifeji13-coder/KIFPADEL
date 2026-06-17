-- Les inscriptions historiques ont été marquées confirmées sans engagement réel.
-- Remettre en pending tant que payment_method n'a pas été choisi par le joueur.

update public.match_participants mp
set
  status = 'pending',
  payment_committed_at = null,
  updated_at = now()
where mp.payment_method is null
  and mp.status = 'confirmed';

update public.match_participants mp
set share_price = m.price_per_player
from public.matches m
where mp.match_id = m.id
  and mp.share_price is null;

alter table public.match_participants
  alter column status set default 'pending';

drop policy if exists "match_participants_delete_self_pending" on public.match_participants;

create policy "match_participants_delete_self_pending"
  on public.match_participants
  for delete
  to authenticated
  using (
    player_id = auth.uid()
    and (
      status = 'pending'
      or (status = 'confirmed' and payment_method is null)
    )
  );
