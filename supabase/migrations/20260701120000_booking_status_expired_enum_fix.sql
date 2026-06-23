-- Remove accidental duplicate overload (integer vs smallint racket qty).
DROP FUNCTION IF EXISTS public.create_booking_atomic(
  uuid, uuid, uuid, timestamptz, timestamptz, numeric, text, text, integer, numeric
);
DROP FUNCTION IF EXISTS public.create_booking_atomic(
  uuid, uuid, uuid, timestamptz, timestamptz, numeric, text, text, smallint, numeric
);

-- booking_status comparisons with 'expired' crashed create_booking_atomic when the enum
-- value was never added (invalid input value for enum booking_status: "expired").

ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'expired';

-- Patch create_booking_atomic overlap / slot queries to compare as text (enum-safe).
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_club_id uuid,
  p_court_id uuid,
  p_player_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_total_price numeric,
  p_payment_method text DEFAULT NULL,
  p_status text DEFAULT 'confirmed',
  p_racket_rental_qty smallint DEFAULT 0,
  p_racket_rental_fee numeric DEFAULT 0
)
RETURNS TABLE (
  ok boolean,
  booking_id uuid,
  error_code text,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_actor_col text;
  v_share numeric(12, 2);
  v_qty smallint;
  v_fee numeric(12, 2);
  v_seat integer;
  v_active_count integer;
  v_participant_status text;
  v_participant_id uuid;
  v_payment_method text := lower(trim(coalesce(p_payment_method, '')));
  v_is_wallet boolean := v_payment_method IN ('wallet', 'online');
  v_apply record;
  v_now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_player_id THEN
    RETURN QUERY SELECT false, NULL::uuid, 'UNAUTHORIZED', 'User is not authorized for this booking.';
    RETURN;
  END IF;

  IF p_starts_at >= p_ends_at THEN
    RETURN QUERY SELECT false, NULL::uuid, 'INVALID_RANGE', 'Invalid booking range.';
    RETURN;
  END IF;

  v_qty := coalesce(p_racket_rental_qty, 0);
  IF v_qty < 0 THEN v_qty := 0; END IF;
  IF v_qty > 1 THEN v_qty := 1; END IF;
  v_fee := round(coalesce(p_racket_rental_fee, 0), 2);
  IF v_qty = 0 THEN v_fee := 0; END IF;
  v_share := round(coalesce(p_total_price, 0), 2);
  v_participant_status := coalesce(p_status, 'confirmed');
  IF v_is_wallet THEN
    v_participant_status := 'confirmed';
  END IF;

  SELECT
    CASE
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'created_by'
      ) THEN 'created_by'
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'player_id'
      ) THEN 'player_id'
      ELSE NULL
    END
  INTO v_actor_col;

  IF v_actor_col IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'SCHEMA_ERROR', 'bookings owner column not found.';
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_court_id::text, 0));

  IF EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.court_id = p_court_id
      AND b.status::text NOT IN ('cancelled', 'expired')
      AND tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) THEN
    RETURN QUERY SELECT false, NULL::uuid, 'SLOT_TAKEN', 'Slot already taken (overlap).';
    RETURN;
  END IF;

  SELECT count(*)::integer
  INTO v_active_count
  FROM public.booking_participants bp
  JOIN public.bookings b ON b.id = bp.booking_id
  WHERE b.court_id = p_court_id
    AND b.starts_at = p_starts_at
    AND b.ends_at = p_ends_at
    AND b.status::text NOT IN ('cancelled', 'expired')
    AND public.is_booking_participant_active(bp.status, bp.created_at);

  IF v_active_count >= 4 THEN
    RETURN QUERY SELECT false, NULL::uuid, 'SLOT_TAKEN', 'Slot is full.';
    RETURN;
  END IF;

  SELECT b.id
  INTO v_booking_id
  FROM public.bookings b
  WHERE b.court_id = p_court_id
    AND b.starts_at = p_starts_at
    AND b.ends_at = p_ends_at
    AND b.status::text NOT IN ('cancelled', 'expired')
  LIMIT 1;

  IF v_booking_id IS NULL THEN
    BEGIN
      IF v_actor_col = 'created_by' THEN
        INSERT INTO public.bookings (
          club_id, court_id, created_by, starts_at, ends_at, total_price, payment_method,
          racket_rental_qty, racket_rental_fee, status
        )
        VALUES (
          p_club_id, p_court_id, p_player_id, p_starts_at, p_ends_at, v_share,
          CASE WHEN v_is_wallet THEN 'wallet' ELSE p_payment_method END,
          v_qty, v_fee, 'confirmed'
        )
        RETURNING id INTO v_booking_id;
      ELSE
        INSERT INTO public.bookings (
          club_id, court_id, player_id, starts_at, ends_at, total_price, payment_method,
          racket_rental_qty, racket_rental_fee, status
        )
        VALUES (
          p_club_id, p_court_id, p_player_id, p_starts_at, p_ends_at, v_share,
          CASE WHEN v_is_wallet THEN 'wallet' ELSE p_payment_method END,
          v_qty, v_fee, 'confirmed'
        )
        RETURNING id INTO v_booking_id;
      END IF;
    EXCEPTION
      WHEN exclusion_violation THEN
        RETURN QUERY SELECT false, NULL::uuid, 'SLOT_TAKEN', 'Slot already taken (overlap).';
        RETURN;
      WHEN OTHERS THEN
        RETURN QUERY SELECT false, NULL::uuid, 'INSERT_FAILED', SQLERRM;
        RETURN;
    END;
  END IF;

  SELECT s.seat
  INTO v_seat
  FROM (
    SELECT gs.seat
    FROM generate_series(1, 4) AS gs(seat)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.booking_participants bp
      WHERE bp.booking_id = v_booking_id
        AND bp.seat_index = gs.seat
        AND public.is_booking_participant_active(bp.status, bp.created_at)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.booking_participant_invites bi
      WHERE bi.booking_id = v_booking_id
        AND bi.seat_index = gs.seat
        AND bi.status = 'pending'
        AND bi.expires_at > v_now
    )
    ORDER BY gs.seat
    LIMIT 1
  ) s;

  IF v_seat IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'SLOT_TAKEN', 'No seat available.';
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.booking_participants (
      booking_id, player_id, seat_index, share_price, payment_method,
      racket_rental_qty, racket_rental_fee, status
    )
    VALUES (
      v_booking_id, p_player_id, v_seat, v_share,
      CASE WHEN v_is_wallet THEN 'wallet' ELSE p_payment_method END,
      v_qty, v_fee, v_participant_status
    )
    RETURNING id INTO v_participant_id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN QUERY SELECT false, NULL::uuid, 'ALREADY_JOINED', 'You already joined this slot.';
      RETURN;
    WHEN OTHERS THEN
      RETURN QUERY SELECT false, NULL::uuid, 'INSERT_FAILED', SQLERRM;
      RETURN;
  END;

  IF v_is_wallet AND v_share > 0 THEN
    SELECT * INTO v_apply
    FROM public.kif_wallet_apply(
      p_player_id, -v_share, 'debit_booking', 'booking_participant', v_participant_id,
      'Réservation terrain',
      jsonb_build_object('booking_id', v_booking_id, 'club_id', p_club_id)
    );

    IF NOT v_apply.ok THEN
      RAISE EXCEPTION 'WALLET_DEBIT_FAILED:%', coalesce(v_apply.error_code, 'INSUFFICIENT_BALANCE');
    END IF;

    UPDATE public.booking_participants
    SET payment_confirmed_at = v_now
    WHERE id = v_participant_id;

    PERFORM public.kif_credit_club_booking_with_commission(
      p_club_id, v_share, 'booking_participant', v_participant_id, 'Jetons KIF — réservation'
    );
  END IF;

  PERFORM public.refresh_booking_slot_status(v_booking_id);

  RETURN QUERY SELECT true, v_booking_id, NULL::text, NULL::text;
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE 'WALLET_DEBIT_FAILED:%' THEN
      RETURN QUERY SELECT false, NULL::uuid, 'INSUFFICIENT_BALANCE', 'Solde Jetons KIF insuffisant.';
      RETURN;
    END IF;
    RETURN QUERY SELECT false, NULL::uuid, 'INSERT_FAILED', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_atomic(
  uuid, uuid, uuid, timestamptz, timestamptz, numeric, text, text, smallint, numeric
) TO authenticated;
