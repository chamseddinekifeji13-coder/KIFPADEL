-- Sprint 1 P0 — Migration 5/6
-- Proper migration for club_debts (was previously .sql.txt and never executed).
-- Includes club_admin role in all policies.

CREATE TABLE IF NOT EXISTS public.club_debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  reason text NOT NULL,                  -- 'no_show', 'late_cancel', 'manual'
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'TND',
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'waived'
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);

ALTER TABLE public.club_debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_debts_select_self" ON public.club_debts;
CREATE POLICY "club_debts_select_self"
  ON public.club_debts FOR SELECT
  USING (player_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS "club_debts_select_staff" ON public.club_debts;
CREATE POLICY "club_debts_select_staff"
  ON public.club_debts FOR SELECT
  USING (
    public.has_club_role(club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[])
  );

DROP POLICY IF EXISTS "club_debts_manage_staff" ON public.club_debts;
CREATE POLICY "club_debts_manage_staff"
  ON public.club_debts FOR ALL
  USING (
    public.has_club_role(club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[])
  )
  WITH CHECK (
    public.has_club_role(club_id, ARRAY['club_staff','club_manager','club_admin','platform_admin']::text[])
  );
