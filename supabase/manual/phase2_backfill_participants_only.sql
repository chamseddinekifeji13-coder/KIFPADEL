-- Backfill : crée des lignes booking_participants pour les réservations sans participant.
-- Exécuter APRÈS que la table booking_participants existe.
-- Safe à ré-exécuter (ne duplique pas).

do $$
declare
  v_actor_col text;
begin
  select
    case
      when exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'bookings' and column_name = 'created_by'
      ) then 'created_by'
      when exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'bookings' and column_name = 'player_id'
      ) then 'player_id'
      else null
    end
  into v_actor_col;

  if v_actor_col is null then
    raise notice 'backfill skipped: no owner column on bookings';
    return;
  end if;

  if v_actor_col = 'created_by' then
    insert into public.booking_participants (
      booking_id, player_id, seat_index, share_price, payment_method, status
    )
    select
      b.id,
      b.created_by,
      1,
      coalesce(b.total_price, 0),
      b.payment_method,
      b.status::text
    from public.bookings b
    where b.created_by is not null
      and b.status not in ('cancelled', 'expired')
      and not exists (
        select 1 from public.booking_participants bp where bp.booking_id = b.id
      );
  else
    insert into public.booking_participants (
      booking_id, player_id, seat_index, share_price, payment_method, status
    )
    select
      b.id,
      b.player_id,
      1,
      coalesce(b.total_price, 0),
      b.payment_method,
      b.status::text
    from public.bookings b
    where b.player_id is not null
      and b.status not in ('cancelled', 'expired')
      and not exists (
        select 1 from public.booking_participants bp where bp.booking_id = b.id
      );
  end if;
end;
$$;
