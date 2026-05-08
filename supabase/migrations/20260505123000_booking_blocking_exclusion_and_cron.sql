-- M2 hardening for booking safety:
-- 1) Materialize blocking state in bookings.is_blocking
-- 2) Schedule cleanup for stale pending bookings (15 min)
-- 3) Add exclusion constraint for overlapping blocking bookings on same court

-- -----------------------------------------------------------------------------
-- 1) Materialized blocking flag
-- -----------------------------------------------------------------------------
alter table public.bookings
  add column if not exists is_blocking boolean;

-- Backfill and normalize existing rows (uses ::text so values not in enum type do not error).
update public.bookings
set is_blocking = case
  when status::text in ('cancelled', 'expired', 'completed', 'no_show') then false
  when status::text = 'pending' and created_at < now() - interval '15 minutes' then false
  else true
end;

-- Ensure deterministic default for new rows.
alter table public.bookings
  alter column is_blocking set default true;

alter table public.bookings
  alter column is_blocking set not null;

create or replace function public.sync_booking_is_blocking()
returns trigger
language plpgsql
as $$
begin
  new.is_blocking :=
    case
      when new.status::text in ('cancelled', 'expired', 'completed', 'no_show') then false
      when new.status::text = 'pending' and new.created_at < now() - interval '15 minutes' then false
      else true
    end;
  return new;
end;
$$;

drop trigger if exists trg_sync_booking_is_blocking on public.bookings;
create trigger trg_sync_booking_is_blocking
before insert or update of status, created_at
on public.bookings
for each row
execute function public.sync_booking_is_blocking();

-- -----------------------------------------------------------------------------
-- 2) Resolve existing overlap conflicts among blocking rows (deterministic)
-- Keep earliest booking (created_at, id) as blocking and demote later overlaps.
-- -----------------------------------------------------------------------------
with overlapping_later_rows as (
  select b1.id
  from public.bookings b1
  where b1.is_blocking = true
    and exists (
      select 1
      from public.bookings b2
      where b2.id <> b1.id
        and b2.court_id = b1.court_id
        and b2.is_blocking = true
        and tstzrange(b2.starts_at, b2.ends_at, '[)') && tstzrange(b1.starts_at, b1.ends_at, '[)')
        and (
          b2.created_at < b1.created_at
          or (b2.created_at = b1.created_at and b2.id < b1.id)
        )
    )
)
update public.bookings b
set is_blocking = false
where b.id in (select id from overlapping_later_rows);

-- -----------------------------------------------------------------------------
-- 3) btree_gist + exclusion constraint (blocking rows only)
-- -----------------------------------------------------------------------------
create extension if not exists btree_gist;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_no_overlap'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_no_overlap
      exclude using gist (
        court_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      )
      where (is_blocking = true);
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 4) pg_cron stale pending cleanup (every 5 minutes)
-- -----------------------------------------------------------------------------
do $$
declare
  v_has_pg_cron boolean;
begin
  select exists (
    select 1
    from pg_extension
    where extname = 'pg_cron'
  ) into v_has_pg_cron;

  if not v_has_pg_cron then
    begin
      create extension if not exists pg_cron;
    exception
      when others then
        raise notice 'pg_cron extension is not available in this environment (%). Cleanup job was not scheduled.', sqlerrm;
    end;
  end if;

  select exists (
    select 1
    from pg_extension
    where extname = 'pg_cron'
  ) into v_has_pg_cron;

  if v_has_pg_cron then
    begin
      perform cron.unschedule(jobid)
      from cron.job
      where jobname = 'kifpadel_expire_stale_pending_bookings';
    exception
      when others then
        raise notice 'Could not unschedule existing cron job (%). Continuing.', sqlerrm;
    end;

    perform cron.schedule(
      'kifpadel_expire_stale_pending_bookings',
      '*/5 * * * *',
      $job$
        update public.bookings
        set status = 'cancelled',
            is_blocking = false
        where status::text = 'pending'
          and is_blocking = true
          and created_at < now() - interval '15 minutes';
      $job$
    );
  end if;
end
$$;
