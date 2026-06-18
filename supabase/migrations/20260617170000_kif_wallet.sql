-- Jetons KIF : wallet joueur, ledger, recharge, reversement club.

-- -----------------------------------------------------------------------------
-- Wallets
-- -----------------------------------------------------------------------------
create table if not exists public.kif_wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance numeric(12, 2) not null default 0 check (balance >= 0),
  currency text not null default 'TND',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kif_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (
    type in ('top_up', 'debit_booking', 'debit_match', 'refund', 'adjustment')
  ),
  amount numeric(12, 2) not null,
  balance_after numeric(12, 2) not null,
  reference_type text,
  reference_id uuid,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists kif_wallet_transactions_user_created_idx
  on public.kif_wallet_transactions (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Recharge packs
-- -----------------------------------------------------------------------------
create table if not exists public.kif_top_up_packages (
  id uuid primary key default gen_random_uuid(),
  label_fr text not null,
  label_en text not null,
  amount numeric(12, 2) not null check (amount > 0),
  bonus_amount numeric(12, 2) not null default 0 check (bonus_amount >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.kif_top_up_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  package_id uuid references public.kif_top_up_packages (id),
  amount numeric(12, 2) not null check (amount > 0),
  bonus_amount numeric(12, 2) not null default 0 check (bonus_amount >= 0),
  status text not null default 'pending' check (
    status in ('pending', 'completed', 'failed', 'cancelled')
  ),
  provider text,
  external_reference text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists kif_top_up_requests_user_created_idx
  on public.kif_top_up_requests (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Ledger club (reversements futurs)
-- -----------------------------------------------------------------------------
create table if not exists public.kif_club_ledger (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  amount numeric(12, 2) not null,
  type text not null check (
    type in ('credit_booking', 'credit_match', 'payout', 'adjustment')
  ),
  reference_type text,
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists kif_club_ledger_club_created_idx
  on public.kif_club_ledger (club_id, created_at desc);

-- Seed packs
insert into public.kif_top_up_packages (label_fr, label_en, amount, bonus_amount, sort_order)
select v.label_fr, v.label_en, v.amount, v.bonus_amount, v.sort_order
from (
  values
    ('25 Jetons', '25 KIF tokens', 25::numeric, 0::numeric, 10),
    ('50 Jetons', '50 KIF tokens', 50::numeric, 2::numeric, 20),
    ('100 Jetons', '100 KIF tokens', 100::numeric, 5::numeric, 30),
    ('200 Jetons', '200 KIF tokens', 200::numeric, 15::numeric, 40)
) as v(label_fr, label_en, amount, bonus_amount, sort_order)
where not exists (select 1 from public.kif_top_up_packages limit 1);

-- -----------------------------------------------------------------------------
-- Core wallet mutation (internal)
-- -----------------------------------------------------------------------------
create or replace function public.kif_wallet_apply(
  p_user_id uuid,
  p_amount numeric,
  p_type text,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  ok boolean,
  new_balance numeric,
  transaction_id uuid,
  error_code text,
  error_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric(12, 2);
  v_new_balance numeric(12, 2);
  v_tx_id uuid;
begin
  if p_amount is null or p_amount = 0 then
    return query
    select false, null::numeric, null::uuid, 'INVALID_AMOUNT', 'Montant invalide.';
    return;
  end if;

  insert into public.kif_wallets (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select w.balance
  into v_balance
  from public.kif_wallets w
  where w.user_id = p_user_id
  for update;

  v_new_balance := round(v_balance + p_amount, 2);
  if v_new_balance < 0 then
    return query
    select false, v_balance, null::uuid, 'INSUFFICIENT_BALANCE', 'Solde Jetons KIF insuffisant.';
    return;
  end if;

  update public.kif_wallets
  set balance = v_new_balance, updated_at = now()
  where user_id = p_user_id;

  insert into public.kif_wallet_transactions (
    user_id, type, amount, balance_after, reference_type, reference_id, description, metadata
  )
  values (
    p_user_id, p_type, p_amount, v_new_balance, p_reference_type, p_reference_id, p_description, coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_tx_id;

  return query select true, v_new_balance, v_tx_id, null::text, null::text;
end;
$$;

revoke all on function public.kif_wallet_apply(
  uuid, numeric, text, text, uuid, text, jsonb
) from public;

-- -----------------------------------------------------------------------------
-- Recharge
-- -----------------------------------------------------------------------------
create or replace function public.kif_request_top_up(p_package_id uuid)
returns table (
  ok boolean,
  request_id uuid,
  total_credit numeric,
  error_code text,
  error_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pkg record;
  v_request_id uuid;
begin
  if v_user_id is null then
    return query select false, null::uuid, null::numeric, 'UNAUTHORIZED', 'Connexion requise.';
    return;
  end if;

  select p.id, p.amount, p.bonus_amount
  into v_pkg
  from public.kif_top_up_packages p
  where p.id = p_package_id and p.is_active = true;

  if v_pkg.id is null then
    return query select false, null::uuid, null::numeric, 'NOT_FOUND', 'Pack introuvable.';
    return;
  end if;

  insert into public.kif_top_up_requests (
    user_id, package_id, amount, bonus_amount, status, provider
  )
  values (
    v_user_id, v_pkg.id, v_pkg.amount, v_pkg.bonus_amount, 'pending', 'pending_gateway'
  )
  returning id into v_request_id;

  return query
  select true, v_request_id, round(v_pkg.amount + v_pkg.bonus_amount, 2), null::text, null::text;
end;
$$;

grant execute on function public.kif_request_top_up(uuid) to authenticated;

create or replace function public.kif_complete_top_up(p_request_id uuid)
returns table (
  ok boolean,
  new_balance numeric,
  error_code text,
  error_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req record;
  v_credit numeric(12, 2);
  v_apply record;
begin
  select r.*
  into v_req
  from public.kif_top_up_requests r
  where r.id = p_request_id
  for update;

  if v_req.id is null then
    return query select false, null::numeric, 'NOT_FOUND', 'Demande introuvable.';
    return;
  end if;

  if v_req.status = 'completed' then
    select w.balance into v_apply.new_balance from public.kif_wallets w where w.user_id = v_req.user_id;
    return query select true, v_apply.new_balance, null::text, null::text;
    return;
  end if;

  if v_req.status <> 'pending' then
    return query select false, null::numeric, 'INVALID_STATUS', 'Demande non valide.';
    return;
  end if;

  v_credit := round(v_req.amount + v_req.bonus_amount, 2);

  select * into v_apply
  from public.kif_wallet_apply(
    v_req.user_id,
    v_credit,
    'top_up',
    'top_up_request',
    v_req.id,
    'Recharge Jetons KIF',
    jsonb_build_object('package_id', v_req.package_id, 'amount', v_req.amount, 'bonus', v_req.bonus_amount)
  );

  if not v_apply.ok then
    return query select false, null::numeric, v_apply.error_code, v_apply.error_message;
    return;
  end if;

  update public.kif_top_up_requests
  set status = 'completed', completed_at = now(), provider = coalesce(provider, 'completed')
  where id = v_req.id;

  return query select true, v_apply.new_balance, null::text, null::text;
end;
$$;

revoke all on function public.kif_complete_top_up(uuid) from public;
grant execute on function public.kif_complete_top_up(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- Match : confirmation avec débit Jetons KIF
-- -----------------------------------------------------------------------------
create or replace function public.confirm_match_participation_kif(
  p_match_id uuid,
  p_payment_commitment boolean default false
)
returns table (
  ok boolean,
  new_balance numeric,
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
  v_match record;
  v_share numeric(12, 2);
  v_apply record;
  v_committed_at timestamptz := now();
begin
  if v_user_id is null then
    return query select false, null::numeric, 'UNAUTHORIZED', 'Connexion requise.';
    return;
  end if;

  if not coalesce(p_payment_commitment, false) then
    return query select false, null::numeric, 'COMMITMENT_REQUIRED', 'Engagement de paiement requis.';
    return;
  end if;

  select mp.*, m.club_id, m.price_per_player
  into v_part
  from public.match_participants mp
  join public.matches m on m.id = mp.match_id
  where mp.match_id = p_match_id and mp.player_id = v_user_id
  for update of mp;

  if v_part.match_id is null then
    return query select false, null::numeric, 'NOT_FOUND', 'Participation introuvable.';
    return;
  end if;

  if v_part.payment_method in ('wallet', 'online')
     and v_part.payment_committed_at is not null
     and v_part.status = 'confirmed' then
    select w.balance into v_apply.new_balance from public.kif_wallets w where w.user_id = v_user_id;
    return query select true, coalesce(v_apply.new_balance, 0), null::text, null::text;
    return;
  end if;

  if v_part.status not in ('pending', 'confirmed') then
    return query select false, null::numeric, 'INVALID_STATUS', 'Participation non modifiable.';
    return;
  end if;

  v_share := round(coalesce(v_part.share_price, v_part.price_per_player, 0), 2);

  if v_share > 0 then
    select * into v_apply
    from public.kif_wallet_apply(
      v_user_id,
      -v_share,
      'debit_match',
      'match_participant',
      null,
      'Match ouvert — participation',
      jsonb_build_object('match_id', p_match_id, 'club_id', v_part.club_id)
    );

    if not v_apply.ok then
      return query select false, null::numeric, v_apply.error_code, v_apply.error_message;
      return;
    end if;

    insert into public.kif_club_ledger (club_id, amount, type, reference_type, reference_id, description)
    values (v_part.club_id, v_share, 'credit_match', 'match_participant', null, 'Jetons KIF — match ouvert');
  else
    select w.balance into v_apply.new_balance from public.kif_wallets w where w.user_id = v_user_id;
    v_apply.new_balance := coalesce(v_apply.new_balance, 0);
  end if;

  update public.match_participants
  set
    status = 'confirmed',
    payment_method = 'wallet',
    payment_committed_at = v_committed_at,
    updated_at = v_committed_at
  where match_id = p_match_id and player_id = v_user_id;

  return query select true, v_apply.new_balance, null::text, null::text;
end;
$$;

grant execute on function public.confirm_match_participation_kif(uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.kif_wallets enable row level security;
alter table public.kif_wallet_transactions enable row level security;
alter table public.kif_top_up_packages enable row level security;
alter table public.kif_top_up_requests enable row level security;
alter table public.kif_club_ledger enable row level security;

drop policy if exists "kif_wallets_select_self" on public.kif_wallets;
create policy "kif_wallets_select_self"
  on public.kif_wallets for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "kif_wallet_transactions_select_self" on public.kif_wallet_transactions;
create policy "kif_wallet_transactions_select_self"
  on public.kif_wallet_transactions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "kif_top_up_packages_select_all" on public.kif_top_up_packages;
create policy "kif_top_up_packages_select_all"
  on public.kif_top_up_packages for select to authenticated
  using (is_active = true);

drop policy if exists "kif_top_up_requests_select_self" on public.kif_top_up_requests;
create policy "kif_top_up_requests_select_self"
  on public.kif_top_up_requests for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "kif_club_ledger_select_staff" on public.kif_club_ledger;
create policy "kif_club_ledger_select_staff"
  on public.kif_club_ledger for select to authenticated
  using (
    public.has_club_role(club_id, array['club_staff', 'club_manager', 'club_admin', 'platform_admin'])
    or public.is_super_admin()
  );
