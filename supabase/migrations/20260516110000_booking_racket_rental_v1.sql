-- V1 racket rental during booking: club settings + booking columns + RPC args.

alter table public.clubs
  add column if not exists racket_rental_enabled boolean not null default false,
  add column if not exists racket_rental_price_per_unit numeric(10, 2);

comment on column public.clubs.racket_rental_enabled is 'When true, players may request racket rentals if price unit is valid.';
comment on column public.clubs.racket_rental_price_per_unit is 'DT per racket per booking; must be > 0 when rental is advertised.';

alter table public.bookings
  add column if not exists racket_rental_qty smallint not null default 0,
  add column if not exists racket_rental_fee numeric(10, 2) not null default 0;

comment on column public.bookings.racket_rental_qty is 'Number of rental rackets; 0 = player brings equipment.';
comment on column public.bookings.racket_rental_fee is 'Total racket rental amount (qty × unit price) at booking time.';

-- Replace RPC: extend with racket params + persist columns when present.

drop function if exists public.create_booking_atomic(uuid, uuid, uuid, timestamptz, timestamptz, numeric, text, text);

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
  v_has_total_price boolean;
  v_has_payment_method boolean;
  v_has_racket_cols boolean;
  v_booking_id uuid;
  v_qty smallint;
  v_fee numeric(10, 2);
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
  if v_qty < 0 then
    v_qty := 0;
  end if;
  v_fee := round(coalesce(p_racket_rental_fee, 0), 2);
  if v_qty = 0 then
    v_fee := 0;
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

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings' and column_name = 'racket_rental_qty'
  )
  into v_has_racket_cols;

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

  if v_has_total_price and v_has_payment_method and v_has_racket_cols then
    execute format(
      'insert into public.bookings (club_id, court_id, %I, starts_at, ends_at, status, total_price, payment_method, racket_rental_qty, racket_rental_fee)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       returning id',
      v_actor_col
    )
    into v_booking_id
    using p_club_id, p_court_id, p_player_id, p_starts_at, p_ends_at, p_status, p_total_price, p_payment_method, v_qty, v_fee;
  elsif v_has_total_price and v_has_payment_method then
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
  uuid, uuid, uuid, timestamptz, timestamptz, numeric, text, text, smallint, numeric
) to authenticated;
