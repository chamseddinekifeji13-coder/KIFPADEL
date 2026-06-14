-- Téléphone à l'inscription + abonnements alertes tournois / événements club.

-- -----------------------------------------------------------------------------
-- Préférences globales joueur
-- -----------------------------------------------------------------------------
create table if not exists public.player_notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tournaments_enabled boolean not null default true,
  club_events_enabled boolean not null default true,
  whatsapp_enabled boolean not null default true,
  email_enabled boolean not null default true,
  all_clubs_alerts boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.player_notification_preferences is
  'Préférences d alertes (tournois, événements) par joueur.';

-- -----------------------------------------------------------------------------
-- Abonnement alertes pour un club précis
-- -----------------------------------------------------------------------------
create table if not exists public.club_alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  club_id uuid not null references public.clubs (id) on delete cascade,
  tournaments_enabled boolean not null default true,
  club_events_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, club_id)
);

create index if not exists club_alert_subscriptions_club_id_idx
  on public.club_alert_subscriptions (club_id);

-- -----------------------------------------------------------------------------
-- File d envoi (WhatsApp / e-mail)
-- -----------------------------------------------------------------------------
create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  club_id uuid references public.clubs (id) on delete set null,
  channel text not null check (channel in ('whatsapp', 'email')),
  kind text not null check (kind in ('tournament', 'club_event')),
  reference_id uuid not null,
  title text not null,
  body text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notification_outbox_pending_idx
  on public.notification_outbox (created_at)
  where status = 'pending';

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.player_notification_preferences enable row level security;

drop policy if exists "player_notification_preferences_select_own" on public.player_notification_preferences;
create policy "player_notification_preferences_select_own"
  on public.player_notification_preferences for select
  using (user_id = auth.uid());

drop policy if exists "player_notification_preferences_insert_own" on public.player_notification_preferences;
create policy "player_notification_preferences_insert_own"
  on public.player_notification_preferences for insert
  with check (user_id = auth.uid());

drop policy if exists "player_notification_preferences_update_own" on public.player_notification_preferences;
create policy "player_notification_preferences_update_own"
  on public.player_notification_preferences for update
  using (user_id = auth.uid());

alter table public.club_alert_subscriptions enable row level security;

drop policy if exists "club_alert_subscriptions_select_own" on public.club_alert_subscriptions;
create policy "club_alert_subscriptions_select_own"
  on public.club_alert_subscriptions for select
  using (user_id = auth.uid());

drop policy if exists "club_alert_subscriptions_insert_own" on public.club_alert_subscriptions;
create policy "club_alert_subscriptions_insert_own"
  on public.club_alert_subscriptions for insert
  with check (user_id = auth.uid());

drop policy if exists "club_alert_subscriptions_update_own" on public.club_alert_subscriptions;
create policy "club_alert_subscriptions_update_own"
  on public.club_alert_subscriptions for update
  using (user_id = auth.uid());

drop policy if exists "club_alert_subscriptions_delete_own" on public.club_alert_subscriptions;
create policy "club_alert_subscriptions_delete_own"
  on public.club_alert_subscriptions for delete
  using (user_id = auth.uid());

alter table public.notification_outbox enable row level security;

-- Outbox : lecture staff plateforme uniquement (envoi via service role).
drop policy if exists "notification_outbox_select_staff" on public.notification_outbox;
create policy "notification_outbox_select_staff"
  on public.notification_outbox for select
  using (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- Init préférences pour profils existants
-- -----------------------------------------------------------------------------
insert into public.player_notification_preferences (user_id)
select p.id
from public.profiles p
where not exists (
  select 1 from public.player_notification_preferences n where n.user_id = p.id
);
