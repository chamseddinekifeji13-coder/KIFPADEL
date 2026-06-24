-- Annulation auto si < 4 joueurs actifs après un délai depuis la réservation (configurable par club).

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS booking_fill_deadline_minutes smallint NOT NULL DEFAULT 30
    CHECK (
      booking_fill_deadline_minutes = 0
      OR (booking_fill_deadline_minutes BETWEEN 5 AND 1440)
    );

COMMENT ON COLUMN public.clubs.booking_fill_deadline_minutes IS
  'Minutes après création de la réservation pour atteindre 4 joueurs actifs ; 0 = règle désactivée.';

CREATE OR REPLACE FUNCTION public.refund_booking_participant_wallet_if_needed(p_participant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bp public.booking_participants%ROWTYPE;
  v_refund numeric(12, 2);
  v_apply record;
BEGIN
  SELECT * INTO v_bp
  FROM public.booking_participants
  WHERE id = p_participant_id;

  IF v_bp.id IS NULL THEN
    RETURN;
  END IF;

  IF lower(coalesce(v_bp.payment_method, '')) NOT IN ('wallet', 'online') THEN
    RETURN;
  END IF;

  IF v_bp.payment_confirmed_at IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.kif_wallet_transactions t
    WHERE t.reference_type = 'booking_participant'
      AND t.reference_id = p_participant_id
      AND t.type = 'refund'
  ) THEN
    RETURN;
  END IF;

  v_refund := round(coalesce(v_bp.share_price, 0) + coalesce(v_bp.racket_rental_fee, 0), 2);
  IF v_refund <= 0 THEN
    RETURN;
  END IF;

  SELECT * INTO v_apply
  FROM public.kif_wallet_apply(
    v_bp.player_id,
    v_refund,
    'refund',
    'booking_participant',
    p_participant_id,
    'Remboursement — réservation annulée (groupe incomplet)',
    jsonb_build_object('reason', 'underfilled_booking_cancel')
  );

  IF coalesce(v_apply.ok, false) THEN
    INSERT INTO public.kif_club_ledger (club_id, amount, type, reference_type, reference_id, description)
    SELECT
      b.club_id,
      -v_refund,
      'adjustment',
      'booking_participant',
      p_participant_id,
      'Annulation auto — remboursement jetons KIF (groupe incomplet)'
    FROM public.bookings b
    WHERE b.id = v_bp.booking_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_underfilled_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_participant record;
  v_cancelled integer := 0;
BEGIN
  FOR v_booking IN
    SELECT b.id
    FROM public.bookings b
    INNER JOIN public.clubs c ON c.id = b.club_id
    WHERE c.booking_fill_deadline_minutes > 0
      AND b.status::text IN ('confirmed', 'pending')
      AND b.starts_at > now()
      AND b.created_at + make_interval(mins => c.booking_fill_deadline_minutes) <= now()
      AND public.count_active_booking_participants(b.id) < 4
    FOR UPDATE OF b
  LOOP
    FOR v_participant IN
      SELECT bp.id
      FROM public.booking_participants bp
      WHERE bp.booking_id = v_booking.id
        AND public.is_booking_participant_active(bp.status, bp.created_at)
    LOOP
      PERFORM public.refund_booking_participant_wallet_if_needed(v_participant.id);
    END LOOP;

    UPDATE public.booking_participants
    SET status = 'cancelled'
    WHERE booking_id = v_booking.id
      AND public.is_booking_participant_active(status, created_at);

    UPDATE public.booking_participant_invites
    SET status = 'cancelled'
    WHERE booking_id = v_booking.id
      AND status = 'pending';

    UPDATE public.bookings
    SET
      status = 'cancelled',
      is_blocking = false
    WHERE id = v_booking.id;

    v_cancelled := v_cancelled + 1;
  END LOOP;

  RETURN v_cancelled;
END;
$$;

DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'kifpadel_cancel_underfilled_bookings';

    PERFORM cron.schedule(
      'kifpadel_cancel_underfilled_bookings',
      '*/5 * * * *',
      $$SELECT public.cancel_underfilled_bookings();$$
    );
  END IF;
END
$cron$;
