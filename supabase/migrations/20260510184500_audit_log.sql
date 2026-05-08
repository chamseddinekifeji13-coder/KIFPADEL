-- -----------------------------------------------------------------------------
-- Append-only-ish audit ledger for privileged operations (Super Admin V1).
-- Only super admins may INSERT/SELECT/UPDATE (updates reserved for corrective metadata).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  actor_global_role text NULL,
  action text NOT NULL,
  target_table text NULL,
  target_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT audit_log_action_chk CHECK (
    trim(action) <> ''
  )
);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log (created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_insert_super_admin ON public.audit_log;
CREATE POLICY audit_log_insert_super_admin
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS audit_log_select_super_admin ON public.audit_log;
CREATE POLICY audit_log_select_super_admin
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS audit_log_update_super_admin ON public.audit_log;
CREATE POLICY audit_log_update_super_admin
  ON public.audit_log FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

COMMENT ON TABLE public.audit_log IS
  'Platform audit trail written by authenticated super_admin sessions.';
REVOKE DELETE ON public.audit_log FROM anon, authenticated;
