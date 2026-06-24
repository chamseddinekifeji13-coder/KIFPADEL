-- Notifications WhatsApp/e-mail quand une réservation est annulée (groupe incomplet).

DO $$
DECLARE
  v_kind_constraint text;
BEGIN
  SELECT c.conname
  INTO v_kind_constraint
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'notification_outbox'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%kind%';

  IF v_kind_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.notification_outbox DROP CONSTRAINT %I', v_kind_constraint);
  END IF;
END
$$;

ALTER TABLE public.notification_outbox
  ADD CONSTRAINT notification_outbox_kind_check
  CHECK (kind IN ('tournament', 'club_event', 'booking_underfilled_cancelled'));

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
  v_title text;
  v_body text;
BEGIN
  FOR v_booking IN
    SELECT
      b.id,
      b.club_id,
      b.created_at,
      b.starts_at,
      b.ends_at,
      coalesce(c.booking_fill_deadline_minutes, 0) AS fill_deadline_minutes,
      coalesce(c.name, 'Club') AS club_name
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

    v_title := format('Réservation annulée — %s', v_booking.club_name);
    v_body := format(
      '%s|%s|%s|https://www.kifpadel.tn/fr/bookings',
      v_booking.club_name,
      to_char(v_booking.starts_at AT TIME ZONE 'Africa/Tunis', 'DD/MM/YYYY'),
      to_char(v_booking.starts_at AT TIME ZONE 'Africa/Tunis', 'HH24:MI')
        || '–' ||
      to_char(v_booking.ends_at AT TIME ZONE 'Africa/Tunis', 'HH24:MI')
    );

    INSERT INTO public.notification_outbox (
      user_id,
      club_id,
      channel,
      kind,
      reference_id,
      title,
      body
    )
    SELECT
      bp.player_id,
      v_booking.club_id,
      'whatsapp',
      'booking_underfilled_cancelled',
      v_booking.id,
      v_title,
      v_body
    FROM public.booking_participants bp
    LEFT JOIN public.player_notification_preferences pref ON pref.user_id = bp.player_id
    WHERE bp.booking_id = v_booking.id
      AND coalesce(pref.whatsapp_enabled, true) = true
      AND NOT EXISTS (
        SELECT 1
        FROM public.notification_outbox o
        WHERE o.user_id = bp.player_id
          AND o.channel = 'whatsapp'
          AND o.kind = 'booking_underfilled_cancelled'
          AND o.reference_id = v_booking.id
      );

    INSERT INTO public.notification_outbox (
      user_id,
      club_id,
      channel,
      kind,
      reference_id,
      title,
      body
    )
    SELECT
      bp.player_id,
      v_booking.club_id,
      'email',
      'booking_underfilled_cancelled',
      v_booking.id,
      v_title,
      v_body
    FROM public.booking_participants bp
    LEFT JOIN public.player_notification_preferences pref ON pref.user_id = bp.player_id
    WHERE bp.booking_id = v_booking.id
      AND coalesce(pref.email_enabled, true) = true
      AND NOT EXISTS (
        SELECT 1
        FROM public.notification_outbox o
        WHERE o.user_id = bp.player_id
          AND o.channel = 'email'
          AND o.kind = 'booking_underfilled_cancelled'
          AND o.reference_id = v_booking.id
      );

    v_cancelled := v_cancelled + 1;
  END LOOP;

  RETURN v_cancelled;
END;
$$;
