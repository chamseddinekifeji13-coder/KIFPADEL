-- Regénère les tokens des invitations pending (lien complet perdu côté client).

CREATE OR REPLACE FUNCTION public.refresh_booking_split_invite_links(p_booking_id uuid)
RETURNS TABLE (
  invite_id uuid,
  seat_index smallint,
  invite_token text,
  share_price numeric,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_club_id uuid;
  v_deadline_hours integer;
  v_expires timestamptz;
  v_inv record;
  v_raw text;
  v_hash text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT b.club_id
  INTO v_club_id
  FROM public.bookings b
  WHERE b.id = p_booking_id
    AND b.status::text NOT IN ('cancelled', 'completed', 'no_show', 'expired');

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.booking_participants bp
    WHERE bp.booking_id = p_booking_id
      AND bp.player_id = v_user
      AND public.is_booking_participant_active(bp.status, bp.created_at)
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = p_booking_id AND b.created_by = v_user
  ) THEN
    RAISE EXCEPTION 'NOT_ORGANIZER';
  END IF;

  SELECT coalesce(c.split_payment_deadline_hours, 24)
  INTO v_deadline_hours
  FROM public.clubs c
  WHERE c.id = v_club_id;

  v_expires := now() + make_interval(hours => v_deadline_hours);

  FOR v_inv IN
    SELECT inv.id, inv.seat_index, inv.share_price
    FROM public.booking_participant_invites inv
    WHERE inv.booking_id = p_booking_id
      AND inv.status = 'pending'
      AND inv.expires_at > now()
    ORDER BY inv.seat_index
  LOOP
    v_raw := encode(extensions.gen_random_bytes(24), 'hex');
    v_hash := public.booking_invite_token_hash(v_raw);

    UPDATE public.booking_participant_invites
    SET
      token_hash = v_hash,
      expires_at = v_expires,
      invited_by = v_user
    WHERE id = v_inv.id;

    invite_id := v_inv.id;
    seat_index := v_inv.seat_index;
    invite_token := v_raw;
    share_price := v_inv.share_price;
    expires_at := v_expires;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_booking_split_invite_links(uuid) TO authenticated;
