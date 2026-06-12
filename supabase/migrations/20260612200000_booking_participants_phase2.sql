-- Phase 2 : 4 places par créneau, paiement par joueur, no-show individuel.

-- -----------------------------------------------------------------------------
-- 1) booking_participants
-- -----------------------------------------------------------------------------
create table if not exists public.booking_participants (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  player_id uuid not null references auth.users (id) on delete cascade,
  seat_index smallint not null check (seat_index between 1 and 4),
  share_price numeric(12, 2) not null,
  payment_method text,
  racket_rental_qty smallint not null default 0,
  racket_rental_fee numeric(10, 2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (booking_id, seat_index),
  unique (booking_id, player_id)
);

create index if not exists booking_participants_booking_id_idx
  on public.booking_participants (booking_id);

create index if not exists booking_participants_player_id_idx
  on public.booking_participants (player_id);

comment on table public.booking_participants is
  'Place individuelle sur un créneau (1–4 joueurs). share_price = part joueur + raquette.';

-- -----------------------------------------------------------------------------
-- 2) club_debts.participant_id
-- -----------------------------------------------------------------------------
alter table public.club_debts
  add column if not exists participant_id uuid references public.booking_participants (id) on delete set null;

create unique index if not exists club_debts_participant_reason_uidx
  on public.club_debts (participant_id, reason)
  where participant_id is not null;

-- -----------------------------------------------------------------------------
-- 3) Helpers : participant actif (non stale pending)
-- -----------------------------------------------------------------------------
create or replace function public.is_booking_participant_active(
  p_status text,
  p_created_at timestamptz
)
returns boolean
language sql
immutable
as $$
  select
    p_status is not null
    and p_status not in ('cancelled', 'expired', 'no_show')
    and (
      p_status <> 'pending'
      or p_created_at >= now() - interval '15 minutes'
    );
$$;

create or replace function public.count_active_booking_participants(p_booking_id uuid)
returns integer
language sql
stable
as $$
  select count(*)::integer
  from public.booking_participants bp
  where bp.booking_id = p_booking_id
    and public.is_booking_participant_active(bp.status, bp.created_at);
$$;

-- -----------------------------------------------------------------------------
-- 4) Sync booking open/full + is_blocking (4 places = terrain bloqué)
-- -----------------------------------------------------------------------------
create or replace function public.refresh_booking_slot_status(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_new_status text;
  v_new_blocking boolean;
begin
  if p_booking_id is null then
    return;
  end if;

  v_count := public.count_active_booking_participants(p_booking_id);

  if v_count >= 4 then
    v_new_status := 'full';
    v_new_blocking := true;
  elsif v_count > 0 then
    v_new_status := 'open';
    v_new_blocking := false;
  else
    v_new_status := 'cancelled';
    v_new_blocking := false;
  end if;

  update public.bookings b
  set
    status = v_new_status,
    is_blocking = v_new_blocking
  where b.id = p_booking_id
    and b.status not in ('completed', 'cancelled');
end;
$$;

create or replace function public.trg_refresh_booking_slot_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_booking_slot_status(
    case when tg_op = 'DELETE' then old.booking_id else new.booking_id end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_booking_participants_refresh_slot on public.booking_participants;
create trigger trg_booking_participants_refresh_slot
after insert or update of status, created_at or delete
on public.booking_participants
for each row
execute function public.trg_refresh_booking_slot_status();

-- -----------------------------------------------------------------------------
-- 5) bookings.is_blocking trigger (open = non bloquant, full = bloquant)
-- -----------------------------------------------------------------------------
create or replace function public.sync_booking_is_blocking()
returns trigger
language plpgsql
as $$
begin
  new.is_blocking :=
    case
      when new.status::text = 'full' then true
      when new.status::text = 'open' then false
      when new.status::text in ('cancelled', 'expired', 'completed', 'no_show') then false
      when new.status::text = 'pending' and new.created_at < now() - interval '15 minutes' then false
      when new.status::text in ('confirmed', 'pending') then true
      else false
    end;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6) Backfill participants (siège 1 = réservation legacy)
-- -----------------------------------------------------------------------------
insert into public.booking_participants (
  booking_id,
  player_id,
  seat_index,
  share_price,
  payment_method,
  racket_rental_qty,
  racket_rental_fee,
  status,
  created_at
)
select
  b.id,
  coalesce(b.created_by, b.player_id),
  1,
  coalesce(b.total_price, 10),
  b.payment_method,
  coalesce(b.racket_rental_qty, 0),
  coalesce(b.racket_rental_fee, 0),
  case
    when b.status::text in ('cancelled', 'expired', 'no_show', 'completed') then b.status::text
    when b.status::text = 'pending' then 'pending'
    else 'confirmed'
  end,
  b.created_at
from public.bookings b
where coalesce(b.created_by, b.player_id) is not null
  and not exists (
    select 1 from public.booking_participants bp where bp.booking_id = b.id
  );

update public.bookings b
set status = 'open', is_blocking = false
where b.status::text in ('confirmed', 'pending')
  and public.count_active_booking_participants(b.id) between 1 and 3;

update public.bookings b
set status = 'full', is_blocking = true
where public.count_active_booking_participants(b.id) >= 4;

-- -----------------------------------------------------------------------------
-- 7) RPC : rejoindre un créneau (create_booking_atomic → join slot)
-- -----------------------------------------------------------------------------
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

  -- Créneau déjà complet (autre session bloquante)
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

  -- Session existante pour ce créneau
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
         values ($1, $2, $3, $4, $5, ''open'', $6, $7, $8, $9, false)
         returning id',
        v_actor_col
      )
      into v_booking_id
      using p_club_id, p_court_id, p_player_id, p_starts_at, p_ends_at, v_share, p_payment_method, v_qty, v_fee;
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
      p_payment_method,
      v_qty,
      v_fee,
      v_participant_status
    );
  exception
    when unique_violation then
      return query select false, null::uuid, 'ALREADY_JOINED', 'You already joined this slot.';
      return;
    when others then
      return query select false, null::uuid, 'INSERT_FAILED', SQLERRM;
      return;
  end;

  perform public.refresh_booking_slot_status(v_booking_id);

  return query select true, v_booking_id, null::text, null::text;
end;
$$;

grant execute on function public.create_booking_atomic(
  uuid, uuid, uuid, timestamptz, timestamptz, numeric, text, text, smallint, numeric
) to authenticated;

-- -----------------------------------------------------------------------------
-- 8) RLS booking_participants
-- -----------------------------------------------------------------------------
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

drop policy if exists "booking_participants_update_staff" on public.booking_participants;
create policy "booking_participants_update_staff"
  on public.booking_participants for update
  using (
    public.has_club_role(
      (select b.club_id from public.bookings b where b.id = booking_id),
      array['club_staff', 'club_manager', 'club_admin', 'platform_admin']
    )
  );
