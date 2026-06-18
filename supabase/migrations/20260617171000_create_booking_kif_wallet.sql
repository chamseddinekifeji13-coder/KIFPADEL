-- Booking : débit Jetons KIF atomique dans create_booking_atomic

create or replace function public.create_booking_atomic(
  p_club_id uuid,
  p_court_id uuid,
  p_player_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_total_price numeric default null,
  p_payment_method text default null,
  p_status text default 'confirmed',
  p_racket_rental_qty smallint default 0,
  p_racket_rental_fee numeric default 0
)
returns table (
  ok boolean,
  booking_id uuid,
  error_code text,
  error_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_col text;
  v_booking_id uuid;
  v_qty smallint;
  v_fee numeric(10, 2);
  v_share numeric(12, 2);
  v_seat smallint;
  v_active_count integer;
  v_participant_status text;
  v_participant_id uuid;
  v_payment_method text := lower(trim(coalesce(p_payment_method, '')));
  v_is_wallet boolean := v_payment_method in ('wallet', 'online');
  v_apply record;
  v_now timestamptz := now();
begin
  if auth.uid() is null or auth.uid() <> p_player_id then
    return query select false, null::uuid, 'UNAUTHORIZED', 'User is not authorized for this booking.';
    return;
  end if;

  if p_starts_at >= p_ends_at then
    return query select false, null::uuid, 'INVALID_RANGE', 'Invalid booking range.';
    return;
  end if;

  v_qty := coalesce(p_racket_rental_qty, 0);
  if v_qty < 0 then v_qty := 0; end if;
  if v_qty > 1 then v_qty := 1; end if;
  v_fee := round(coalesce(p_racket_rental_fee, 0), 2);
  if v_qty = 0 then v_fee := 0; end if;
  v_share := round(coalesce(p_total_price, 0), 2);
  v_participant_status := coalesce(p_status, 'confirmed');
  if v_is_wallet then
    v_participant_status := 'confirmed';
  end if;

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
    return query select false, null::uuid, 'SCHEMA_ERROR', 'bookings owner column not found.';
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_court_id::text, 0));

  if exists (
    select 1
    from public.bookings b
    where b.court_id = p_court_id
      and b.is_blocking = true
      and b.status not in ('cancelled', 'completed', 'no_show')
      and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then
    return query select false, null::uuid, 'SLOT_TAKEN', 'Slot is full (4 players).';
    return;
  end if;

  select b.id
  into v_booking_id
  from public.bookings b
  where b.court_id = p_court_id
    and b.starts_at = p_starts_at
    and b.ends_at = p_ends_at
    and b.status not in ('cancelled', 'completed', 'no_show')
  order by b.created_at
  limit 1
  for update;

  if v_booking_id is not null then
    if exists (
      select 1
      from public.booking_participants bp
      where bp.booking_id = v_booking_id
        and bp.player_id = p_player_id
        and public.is_booking_participant_active(bp.status, bp.created_at)
    ) then
      return query select false, null::uuid, 'ALREADY_JOINED', 'You already joined this slot.';
      return;
    end if;

    v_active_count := public.count_active_booking_participants(v_booking_id);
    if v_active_count >= 4 then
      return query select false, null::uuid, 'SLOT_TAKEN', 'Slot is full (4 players).';
      return;
    end if;
  else
    begin
      execute format(
        'insert into public.bookings (club_id, court_id, %I, starts_at, ends_at, status, total_price, payment_method, racket_rental_qty, racket_rental_fee, is_blocking)
         values ($1, $2, $3, $4, $5, ''confirmed'', $6, $7, $8, $9, false)
         returning id',
        v_actor_col
      )
      into v_booking_id
      using p_club_id, p_court_id, p_player_id, p_starts_at, p_ends_at, v_share,
        case when v_is_wallet then 'wallet' else p_payment_method end,
        v_qty, v_fee;
    exception
      when exclusion_violation then
        return query select false, null::uuid, 'SLOT_TAKEN', 'Slot already taken (overlap).';
        return;
      when others then
        return query select false, null::uuid, 'INSERT_FAILED', SQLERRM;
        return;
    end;
  end if;

  select s.seat
  into v_seat
  from (
    select gs.seat
    from generate_series(1, 4) as gs(seat)
    where not exists (
      select 1
      from public.booking_participants bp
      where bp.booking_id = v_booking_id
        and bp.seat_index = gs.seat
        and public.is_booking_participant_active(bp.status, bp.created_at)
    )
    order by gs.seat
    limit 1
  ) s;

  if v_seat is null then
    return query select false, null::uuid, 'SLOT_TAKEN', 'No seat available.';
    return;
  end if;

  begin
    insert into public.booking_participants (
      booking_id,
      player_id,
      seat_index,
      share_price,
      payment_method,
      racket_rental_qty,
      racket_rental_fee,
      status
    )
    values (
      v_booking_id,
      p_player_id,
      v_seat,
      v_share,
      case when v_is_wallet then 'wallet' else p_payment_method end,
      v_qty,
      v_fee,
      v_participant_status
    )
    returning id into v_participant_id;
  exception
    when unique_violation then
      return query select false, null::uuid, 'ALREADY_JOINED', 'You already joined this slot.';
      return;
    when others then
      return query select false, null::uuid, 'INSERT_FAILED', SQLERRM;
      return;
  end;

  if v_is_wallet and v_share > 0 then
    select * into v_apply
    from public.kif_wallet_apply(
      p_player_id,
      -v_share,
      'debit_booking',
      'booking_participant',
      v_participant_id,
      'Réservation terrain',
      jsonb_build_object('booking_id', v_booking_id, 'club_id', p_club_id)
    );

    if not v_apply.ok then
      raise exception 'WALLET_DEBIT_FAILED:%', coalesce(v_apply.error_code, 'INSUFFICIENT_BALANCE');
    end if;

    update public.booking_participants
    set payment_confirmed_at = v_now
    where id = v_participant_id;

    insert into public.kif_club_ledger (club_id, amount, type, reference_type, reference_id, description)
    values (p_club_id, v_share, 'credit_booking', 'booking_participant', v_participant_id, 'Jetons KIF — réservation');
  end if;

  perform public.refresh_booking_slot_status(v_booking_id);

  return query select true, v_booking_id, null::text, null::text;
exception
  when others then
    if SQLERRM like 'WALLET_DEBIT_FAILED:%' then
      return query select false, null::uuid, 'INSUFFICIENT_BALANCE', 'Solde Jetons KIF insuffisant.';
      return;
    end if;
    return query select false, null::uuid, 'INSERT_FAILED', SQLERRM;
end;
$$;

grant execute on function public.create_booking_atomic(
  uuid, uuid, uuid, timestamptz, timestamptz, numeric, text, text, smallint, numeric
) to authenticated;
