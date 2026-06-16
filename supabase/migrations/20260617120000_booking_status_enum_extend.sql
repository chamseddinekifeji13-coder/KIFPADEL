-- booking_status en prod = pending | confirmed | cancelled.
-- La RPC phase 2 et le back-office club utilisent completed / no_show → crash SQL (22P02).

ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'no_show';

-- Sécurité : comparaisons texte si d'autres labels legacy apparaissent.
create or replace function public.refresh_booking_slot_status(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_new_blocking boolean;
begin
  if p_booking_id is null then
    return;
  end if;

  v_count := public.count_active_booking_participants(p_booking_id);

  if v_count >= 4 then
    v_new_blocking := true;
  elsif v_count > 0 then
    v_new_blocking := false;
  else
    v_new_blocking := false;
  end if;

  update public.bookings b
  set
    is_blocking = v_new_blocking,
    status = case
      when v_count = 0 then 'cancelled'
      when b.status::text = 'pending' then b.status
      else 'confirmed'
    end
  where b.id = p_booking_id
    and b.status::text not in ('completed', 'cancelled', 'no_show');
end;
$$;
