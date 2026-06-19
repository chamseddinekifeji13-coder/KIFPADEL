-- Règlement financier et politiques de réservation par club.

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS no_show_debt_mode text NOT NULL DEFAULT 'full_share'
    CHECK (no_show_debt_mode IN ('full_share', 'percent', 'fixed', 'none')),
  ADD COLUMN IF NOT EXISTS no_show_debt_fixed_cents integer,
  ADD COLUMN IF NOT EXISTS no_show_debt_percent smallint NOT NULL DEFAULT 100
    CHECK (no_show_debt_percent >= 1 AND no_show_debt_percent <= 100),
  ADD COLUMN IF NOT EXISTS no_show_trust_penalty smallint NOT NULL DEFAULT 18
    CHECK (no_show_trust_penalty >= 0 AND no_show_trust_penalty <= 50),
  ADD COLUMN IF NOT EXISTS no_show_grace_minutes smallint NOT NULL DEFAULT 15
    CHECK (no_show_grace_minutes >= 5 AND no_show_grace_minutes <= 60),
  ADD COLUMN IF NOT EXISTS no_show_auto_report boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_cancellation_hours smallint NOT NULL DEFAULT 24
    CHECK (free_cancellation_hours >= 1 AND free_cancellation_hours <= 72),
  ADD COLUMN IF NOT EXISTS late_cancel_penalty_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS late_cancel_trust_penalty smallint NOT NULL DEFAULT 10
    CHECK (late_cancel_trust_penalty >= 0 AND late_cancel_trust_penalty <= 50),
  ADD COLUMN IF NOT EXISTS allow_pay_on_site boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS min_trust_for_pay_on_site smallint NOT NULL DEFAULT 70
    CHECK (min_trust_for_pay_on_site >= 0 AND min_trust_for_pay_on_site <= 100),
  ADD COLUMN IF NOT EXISTS require_phone_verification boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_profile_complete boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.clubs.no_show_debt_mode IS
  'full_share = montant de la place ; percent = % de la place ; fixed = montant fixe ; none = pas de dette club';
COMMENT ON COLUMN public.clubs.no_show_debt_fixed_cents IS 'Montant fixe no-show en centimes TND (si mode fixed)';
