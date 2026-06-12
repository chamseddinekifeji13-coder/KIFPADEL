-- Vérification téléphone (WhatsApp OTP) + contrainte un numéro vérifié = un compte.

alter table public.profiles
  add column if not exists phone_e164 text,
  add column if not exists phone_verified_at timestamptz;

comment on column public.profiles.phone_e164 is 'Numéro E.164 (+216…) après vérification WhatsApp.';
comment on column public.profiles.phone_verified_at is 'Horodatage de vérification OTP (WhatsApp).';

create unique index if not exists profiles_phone_e164_verified_unique
  on public.profiles (phone_e164)
  where phone_e164 is not null and phone_verified_at is not null;

create table if not exists public.phone_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  phone_e164 text not null,
  code_hash text not null,
  channel text not null default 'whatsapp',
  attempts smallint not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists phone_verification_challenges_user_created_idx
  on public.phone_verification_challenges (user_id, created_at desc);

alter table public.phone_verification_challenges enable row level security;

drop policy if exists phone_challenges_select_own on public.phone_verification_challenges;
create policy phone_challenges_select_own
  on public.phone_verification_challenges for select
  using (auth.uid() = user_id);

-- Insert/update via server actions (service role ou SECURITY DEFINER) — pas d'insert client direct.
