-- Table for Sponsors
create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website_url text,
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Enable RLS on sponsors
alter table public.sponsors enable row level security;

-- Policies for sponsors
create policy "sponsors_public_read"
  on public.sponsors for select
  using (is_active = true or public.is_platform_admin());

create policy "sponsors_manage_admin"
  on public.sponsors for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Add 'platform_admin' role handling in existing policies if needed
-- (The existing init migration already has some is_platform_admin checks)

-- Add extra fields to clubs for suspension
alter table public.clubs add column if not exists suspended_at timestamptz;
alter table public.clubs add column if not exists suspension_reason text;

-- Add extra fields to profiles for suspension
alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.profiles add column if not exists suspension_reason text;
