-- P1 booking safety fixes:
-- 1) Atomic booking creation (DB-level lock + overlap check).
-- 2) Ignore stale pending bookings after 15 minutes.

create or replace function public.create_booking_atomic(
  p_club_id uuid,
  p_court_id uuid,
  p_player_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_total_price numeric default null,
  p_payment_method text default null,
  p_status text default 'confirmed'
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
  v_has_total_price boolean;
  v_has_payment_method boolean;
  v_booking_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_player_id then
    return query select false, null::uuid, 'UNAUTHORIZED', 'User is not authorized for this booking.';
    return;
  end if;

  if p_starts_at >= p_ends_at then
    return query select false, null::uuid, 'INVALID_RANGE', 'Invalid booking range.';
    return;
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
    return query select false, null::uuid, 'SCHEMA_ERROR', 'bookings owner column not found (created_by/player_id).';
    return;
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings' and column_name = 'total_price'
  ) into v_has_total_price;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings' and column_name = 'payment_method'
  ) into v_has_payment_method;

  -- Court-level lock to serialize concurrent booking attempts.
  perform pg_advisory_xact_lock(hashtextextended(p_court_id::text, 0));

  if exists (
    select 1
    from public.bookings b
    where b.court_id = p_court_id
      and b.starts_at < p_ends_at
      and b.ends_at > p_starts_at
      and b.status <> 'cancelled'
      and not (
        b.status = 'pending'
        and b.created_at < now() - interval '15 minutes'
      )
  ) then
    return query select false, null::uuid, 'SLOT_TAKEN', 'Slot already taken.';
    return;
  end if;

  if v_has_total_price and v_has_payment_method then
    execute format(
      'insert into public.bookings (club_id, court_id, %I, starts_at, ends_at, status, total_price, payment_method)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id',
      v_actor_col
    )
    into v_booking_id
    using p_club_id, p_court_id, p_player_id, p_starts_at, p_ends_at, p_status, p_total_price, p_payment_method;
  elsif v_has_total_price then
    execute format(
      'insert into public.bookings (club_id, court_id, %I, starts_at, ends_at, status, total_price)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id',
      v_actor_col
    )
    into v_booking_id
    using p_club_id, p_court_id, p_player_id, p_starts_at, p_ends_at, p_status, p_total_price;
  elsif v_has_payment_method then
    execute format(
      'insert into public.bookings (club_id, court_id, %I, starts_at, ends_at, status, payment_method)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id',
      v_actor_col
    )
    into v_booking_id
    using p_club_id, p_court_id, p_player_id, p_starts_at, p_ends_at, p_status, p_payment_method;
  else
    execute format(
      'insert into public.bookings (club_id, court_id, %I, starts_at, ends_at, status)
       values ($1, $2, $3, $4, $5, $6)
       returning id',
      v_actor_col
    )
    into v_booking_id
    using p_club_id, p_court_id, p_player_id, p_starts_at, p_ends_at, p_status;
  end if;

  return query select true, v_booking_id, null::text, null::text;
end;
$$;

grant execute on function public.create_booking_atomic(
  uuid, uuid, uuid, timestamptz, timestamptz, numeric, text, text
) to authenticated;
