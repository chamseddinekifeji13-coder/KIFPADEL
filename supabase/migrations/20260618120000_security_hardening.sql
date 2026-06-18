-- Security hardening: protect profile columns, lock down match/booking mutations.

-- -----------------------------------------------------------------------------
-- 1) Profiles — block sensitive column self-escalation
-- -----------------------------------------------------------------------------
create or replace function public.is_elevated_profile_mutation()
returns boolean
language sql
stable
as $$
  select
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_user in ('postgres', 'supabase_admin', 'supabase_auth_admin');
$$;

create or replace function public.guard_profiles_sensitive_columns()
returns trigger
language plpgsql
as $$
begin
  if public.is_elevated_profile_mutation() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.global_role, 'player') is distinct from 'player' then
      raise exception 'profiles: cannot set global_role on insert';
    end if;
    return new;
  end if;

  if new.global_role is distinct from old.global_role then
    raise exception 'profiles: cannot modify global_role';
  end if;

  if new.trust_score is distinct from old.trust_score then
    raise exception 'profiles: cannot modify trust_score directly';
  end if;

  if new.suspended_at is distinct from old.suspended_at then
    raise exception 'profiles: cannot modify suspended_at';
  end if;

  if new.suspension_reason is distinct from old.suspension_reason then
    raise exception 'profiles: cannot modify suspension_reason';
  end if;

  if new.reliability_status is distinct from old.reliability_status then
    raise exception 'profiles: cannot modify reliability_status';
  end if;

  if new.verification_level is distinct from old.verification_level then
    raise exception 'profiles: cannot modify verification_level';
  end if;

  if new.phone_verified_at is distinct from old.phone_verified_at then
    raise exception 'profiles: cannot modify phone_verified_at';
  end if;

  if new.phone_e164 is distinct from old.phone_e164 then
    raise exception 'profiles: cannot modify phone_e164';
  end if;

  if new.main_club_id is distinct from old.main_club_id then
    raise exception 'profiles: cannot modify main_club_id';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_profiles_sensitive_columns on public.profiles;
create trigger trg_guard_profiles_sensitive_columns
  before insert or update on public.profiles
  for each row
  execute function public.guard_profiles_sensitive_columns();

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and coalesce(global_role, 'player') = 'player'
  );

-- -----------------------------------------------------------------------------
-- 2) Match participants — no direct UPDATE (wallet / on_site via RPC only)
-- -----------------------------------------------------------------------------
drop policy if exists "match_participants_update_self" on public.match_participants;

create or replace function public.confirm_match_participation_on_site(
  p_match_id uuid,
  p_payment_commitment boolean default false
)
returns table (
  ok boolean,
  error_code text,
  error_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_part record;
  v_committed_at timestamptz := now();
begin
  if v_user_id is null then
    return query select false, 'UNAUTHORIZED', 'Connexion requise.';
    return;
  end if;

  if not coalesce(p_payment_commitment, false) then
    return query select false, 'COMMITMENT_REQUIRED', 'Engagement de paiement requis.';
    return;
  end if;

  select mp.*
  into v_part
  from public.match_participants mp
  where mp.match_id = p_match_id and mp.player_id = v_user_id
  for update;

  if v_part.match_id is null then
    return query select false, 'NOT_FOUND', 'Participation introuvable.';
    return;
  end if;

  if v_part.status = 'confirmed' and v_part.payment_method = 'on_site' then
    return query select true, null::text, null::text;
    return;
  end if;

  if v_part.status <> 'pending' then
    return query select false, 'INVALID_STATUS', 'Participation non modifiable.';
    return;
  end if;

  update public.match_participants
  set
    status = 'confirmed',
    payment_method = 'on_site',
    payment_committed_at = v_committed_at,
    updated_at = v_committed_at
  where match_id = p_match_id and player_id = v_user_id;

  return query select true, null::text, null::text;
end;
$$;

revoke all on function public.confirm_match_participation_on_site(uuid, boolean) from public;
grant execute on function public.confirm_match_participation_on_site(uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- 3) Bookings — force atomic RPC path (no direct INSERT by clients)
-- -----------------------------------------------------------------------------
drop policy if exists "bookings_insert_owner" on public.bookings;
drop policy if exists "booking_participants_insert_own" on public.booking_participants;
