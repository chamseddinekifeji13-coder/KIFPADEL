-- generate_series(1,4) yields integer; is_seat_reserved_by_invite expected smallint → RPC crash.

DROP FUNCTION IF EXISTS public.is_seat_reserved_by_invite(uuid, smallint);

CREATE OR REPLACE FUNCTION public.is_seat_reserved_by_invite(
  p_booking_id uuid,
  p_seat_index integer
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.booking_participant_invites inv
    WHERE inv.booking_id = p_booking_id
      AND inv.seat_index = p_seat_index
      AND inv.status = 'pending'
      AND inv.expires_at > now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_seat_reserved_by_invite(uuid, integer) TO authenticated;

-- Safer booking status filter (enum-safe).
CREATE OR REPLACE FUNCTION public.create_booking_split_invites(p_booking_id uuid)
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
  v_share numeric(12, 2);
  v_seat integer;
  v_raw text;
  v_hash text;
  v_invite_id uuid;
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

  SELECT bp.share_price
  INTO v_share
  FROM public.booking_participants bp
  WHERE bp.booking_id = p_booking_id
    AND bp.player_id = v_user
  LIMIT 1;

  IF v_share IS NULL OR v_share <= 0 THEN
    SELECT bp.share_price
    INTO v_share
    FROM public.booking_participants bp
    WHERE bp.booking_id = p_booking_id
    ORDER BY bp.created_at
    LIMIT 1;
  END IF;

  v_share := round(coalesce(v_share, 0), 2);

  FOR v_seat IN
    SELECT gs.seat
    FROM generate_series(1, 4) AS gs(seat)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.booking_participants bp
      WHERE bp.booking_id = p_booking_id
        AND bp.seat_index = gs.seat
        AND public.is_booking_participant_active(bp.status, bp.created_at)
    )
    AND NOT public.is_seat_reserved_by_invite(p_booking_id, gs.seat)
    ORDER BY gs.seat
  LOOP
    v_raw := encode(extensions.gen_random_bytes(24), 'hex');
    v_hash := public.booking_invite_token_hash(v_raw);

    INSERT INTO public.booking_participant_invites (
      booking_id,
      seat_index,
      invited_by,
      share_price,
      token_hash,
      expires_at
    )
    VALUES (
      p_booking_id,
      v_seat::smallint,
      v_user,
      v_share,
      v_hash,
      v_expires
    )
    RETURNING id INTO v_invite_id;

    invite_id := v_invite_id;
    seat_index := v_seat::smallint;
    invite_token := v_raw;
    share_price := v_share;
    expires_at := v_expires;
    RETURN NEXT;
  END LOOP;

  PERFORM public.refresh_booking_slot_status(p_booking_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_split_invites(uuid) TO authenticated;
