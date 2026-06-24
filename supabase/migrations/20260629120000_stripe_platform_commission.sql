-- Commission plateforme Kifpadel + support Stripe webhook (recharge wallet).

-- -----------------------------------------------------------------------------
-- Paramètres plateforme (singleton)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  commission_percent numeric(5, 2) NOT NULL DEFAULT 10.00
    CHECK (commission_percent >= 0 AND commission_percent <= 100),
  stripe_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Ledger commission plateforme
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kif_platform_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  type text NOT NULL CHECK (
    type IN ('commission_booking', 'commission_match', 'payout', 'adjustment')
  ),
  club_id uuid REFERENCES public.clubs (id) ON DELETE SET NULL,
  reference_type text,
  reference_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kif_platform_ledger_created_idx
  ON public.kif_platform_ledger (created_at DESC);

ALTER TABLE public.kif_platform_ledger ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Idempotence webhooks Stripe
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Calcul commission : brut → (fee plateforme, net club)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kif_platform_commission_split(p_gross numeric)
RETURNS TABLE (platform_fee numeric, club_net numeric)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_gross numeric(12, 2);
  v_pct numeric(5, 2);
  v_fee numeric(12, 2);
BEGIN
  v_gross := round(coalesce(p_gross, 0), 2);
  IF v_gross <= 0 THEN
    RETURN QUERY SELECT 0::numeric, 0::numeric;
    RETURN;
  END IF;

  SELECT ps.commission_percent INTO v_pct
  FROM public.platform_settings ps
  WHERE ps.id = true;

  v_pct := coalesce(v_pct, 10.00);
  v_fee := round(v_gross * v_pct / 100.0, 2);
  IF v_fee > v_gross THEN
    v_fee := v_gross;
  END IF;

  RETURN QUERY SELECT v_fee, round(v_gross - v_fee, 2);
END;
$$;

-- -----------------------------------------------------------------------------
-- Crédit club avec commission plateforme
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kif_credit_club_booking_with_commission(
  p_club_id uuid,
  p_gross numeric,
  p_reference_type text,
  p_reference_id uuid,
  p_description text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_split record;
BEGIN
  IF coalesce(p_gross, 0) <= 0 THEN
    RETURN;
  END IF;

  SELECT * INTO v_split FROM public.kif_platform_commission_split(p_gross);

  IF v_split.club_net > 0 THEN
    INSERT INTO public.kif_club_ledger (club_id, amount, type, reference_type, reference_id, description)
    VALUES (p_club_id, v_split.club_net, 'credit_booking', p_reference_type, p_reference_id, p_description);
  END IF;

  IF v_split.platform_fee > 0 THEN
    INSERT INTO public.kif_platform_ledger (amount, type, club_id, reference_type, reference_id, description)
    VALUES (
      v_split.platform_fee,
      'commission_booking',
      p_club_id,
      p_reference_type,
      p_reference_id,
      'Commission Kifpadel — ' || coalesce(p_description, 'réservation')
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.kif_credit_club_booking_with_commission(uuid, numeric, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kif_credit_club_booking_with_commission(uuid, numeric, text, uuid, text) TO service_role;

-- -----------------------------------------------------------------------------
-- kif_complete_top_up : support provider Stripe + idempotence external_reference
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kif_complete_top_up(
  p_request_id uuid,
  p_provider text DEFAULT NULL,
  p_external_reference text DEFAULT NULL
)
RETURNS TABLE (
  ok boolean,
  new_balance numeric,
  error_code text,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req record;
  v_credit numeric(12, 2);
  v_apply record;
  v_existing_id uuid;
BEGIN
  IF p_external_reference IS NOT NULL AND trim(p_external_reference) <> '' THEN
    SELECT r.id INTO v_existing_id
    FROM public.kif_top_up_requests r
    WHERE r.external_reference = p_external_reference
      AND r.status = 'completed'
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      SELECT w.balance INTO v_apply.new_balance
      FROM public.kif_wallets w
      JOIN public.kif_top_up_requests r ON r.user_id = w.user_id
      WHERE r.id = v_existing_id;
      RETURN QUERY SELECT true, v_apply.new_balance, NULL::text, NULL::text;
      RETURN;
    END IF;
  END IF;

  SELECT r.*
  INTO v_req
  FROM public.kif_top_up_requests r
  WHERE r.id = p_request_id
  FOR UPDATE;

  IF v_req.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::numeric, 'NOT_FOUND', 'Demande introuvable.';
    RETURN;
  END IF;

  IF v_req.status = 'completed' THEN
    SELECT w.balance INTO v_apply.new_balance FROM public.kif_wallets w WHERE w.user_id = v_req.user_id;
    RETURN QUERY SELECT true, v_apply.new_balance, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF v_req.status <> 'pending' THEN
    RETURN QUERY SELECT false, NULL::numeric, 'INVALID_STATUS', 'Demande non valide.';
    RETURN;
  END IF;

  v_credit := round(v_req.amount + v_req.bonus_amount, 2);

  SELECT * INTO v_apply
  FROM public.kif_wallet_apply(
    v_req.user_id,
    v_credit,
    'top_up',
    'top_up_request',
    v_req.id,
    'Recharge Jetons KIF',
    jsonb_build_object(
      'package_id', v_req.package_id,
      'amount', v_req.amount,
      'bonus', v_req.bonus_amount,
      'provider', coalesce(p_provider, 'stripe')
    )
  );

  IF NOT v_apply.ok THEN
    RETURN QUERY SELECT false, NULL::numeric, v_apply.error_code, v_apply.error_message;
    RETURN;
  END IF;

  UPDATE public.kif_top_up_requests
  SET
    status = 'completed',
    completed_at = now(),
    provider = coalesce(nullif(trim(p_provider), ''), provider, 'stripe'),
    external_reference = coalesce(nullif(trim(p_external_reference), ''), external_reference)
  WHERE id = v_req.id;

  RETURN QUERY SELECT true, v_apply.new_balance, NULL::text, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.kif_complete_top_up(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kif_complete_top_up(uuid, text, text) TO service_role;

-- -----------------------------------------------------------------------------
-- create_booking_atomic : commission sur crédit club
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_club_id uuid,
  p_court_id uuid,
  p_player_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_total_price numeric DEFAULT NULL,
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
  v_actor_col text;
  v_booking_id uuid;
  v_qty smallint;
  v_fee numeric(10, 2);
  v_share numeric(12, 2);
  v_seat smallint;
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
      AND b.status NOT IN ('cancelled', 'expired')
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
    AND b.status NOT IN ('cancelled', 'expired')
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
    AND b.status NOT IN ('cancelled', 'expired')
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

-- accept_booking_invite_atomic : commission plateforme
CREATE OR REPLACE FUNCTION public.accept_booking_invite_atomic(
  p_invite_id uuid,
  p_raw_token text,
  p_payment_method text DEFAULT 'wallet'
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
  v_user uuid := auth.uid();
  v_inv record;
  v_booking_id uuid;
  v_club_id uuid;
  v_participant_id uuid;
  v_payment text := lower(trim(coalesce(p_payment_method, 'wallet')));
  v_is_wallet boolean;
  v_apply record;
  v_now timestamptz := now();
BEGIN
  IF v_user IS NULL THEN
    RETURN QUERY SELECT false, null::uuid, 'UNAUTHORIZED', 'Connexion requise.';
    RETURN;
  END IF;

  SELECT i.* INTO v_inv
  FROM public.booking_participant_invites i
  WHERE i.id = p_invite_id
  FOR UPDATE;

  IF v_inv.id IS NULL THEN
    RETURN QUERY SELECT false, null::uuid, 'NOT_FOUND', 'Invitation introuvable.';
    RETURN;
  END IF;

  IF v_inv.status <> 'pending' OR v_inv.expires_at <= v_now THEN
    RETURN QUERY SELECT false, null::uuid, 'EXPIRED', 'Cette invitation a expiré.';
    RETURN;
  END IF;

  IF v_inv.token_hash <> public.booking_invite_token_hash(p_raw_token) THEN
    RETURN QUERY SELECT false, null::uuid, 'INVALID_TOKEN', 'Lien invalide.';
    RETURN;
  END IF;

  v_booking_id := v_inv.booking_id;
  v_is_wallet := v_payment IN ('wallet', 'online');

  SELECT b.club_id INTO v_club_id
  FROM public.bookings b
  WHERE b.id = v_booking_id
    AND b.status NOT IN ('cancelled', 'completed', 'no_show');

  IF v_club_id IS NULL THEN
    RETURN QUERY SELECT false, null::uuid, 'BOOKING_GONE', 'Réservation indisponible.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.booking_participants bp
    WHERE bp.booking_id = v_booking_id AND bp.player_id = v_user
      AND public.is_booking_participant_active(bp.status, bp.created_at)
  ) THEN
    RETURN QUERY SELECT false, null::uuid, 'ALREADY_JOINED', 'Vous êtes déjà sur ce créneau.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.booking_participants bp
    WHERE bp.booking_id = v_booking_id AND bp.seat_index = v_inv.seat_index
      AND public.is_booking_participant_active(bp.status, bp.created_at)
  ) THEN
    RETURN QUERY SELECT false, null::uuid, 'SEAT_TAKEN', 'Cette place est déjà prise.';
    RETURN;
  END IF;

  INSERT INTO public.booking_participants (
    booking_id, player_id, seat_index, share_price, payment_method, status
  )
  VALUES (
    v_booking_id, v_user, v_inv.seat_index, v_inv.share_price,
    CASE WHEN v_is_wallet THEN 'wallet' ELSE v_payment END, 'confirmed'
  )
  RETURNING id INTO v_participant_id;

  IF v_is_wallet AND v_inv.share_price > 0 THEN
    SELECT * INTO v_apply FROM public.kif_wallet_apply(
      v_user, -v_inv.share_price, 'debit_booking', 'booking_participant', v_participant_id,
      'Réservation terrain (invite)',
      jsonb_build_object('booking_id', v_booking_id, 'invite_id', p_invite_id)
    );

    IF NOT v_apply.ok THEN
      RAISE EXCEPTION 'WALLET_DEBIT_FAILED:%', coalesce(v_apply.error_code, 'INSUFFICIENT_BALANCE');
    END IF;

    UPDATE public.booking_participants SET payment_confirmed_at = v_now WHERE id = v_participant_id;

    PERFORM public.kif_credit_club_booking_with_commission(
      v_club_id, v_inv.share_price, 'booking_participant', v_participant_id,
      'Jetons KIF — réservation (invite)'
    );
  END IF;

  UPDATE public.booking_participant_invites
  SET status = 'accepted', accepted_at = v_now, accepted_by = v_user, participant_id = v_participant_id
  WHERE id = p_invite_id;

  PERFORM public.refresh_booking_slot_status(v_booking_id);
  RETURN QUERY SELECT true, v_booking_id, null::text, null::text;
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE 'WALLET_DEBIT_FAILED:%' THEN
      RETURN QUERY SELECT false, null::uuid, 'INSUFFICIENT_BALANCE', 'Solde Jetons KIF insuffisant.';
      RETURN;
    END IF;
    RETURN QUERY SELECT false, null::uuid, 'INSERT_FAILED', SQLERRM;
END;
$$;

DROP FUNCTION IF EXISTS public.kif_complete_top_up(uuid);

-- -----------------------------------------------------------------------------
-- accept_booking_invite_atomic : commission sur crédit club
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_booking_invite_atomic(
  p_invite_id uuid,
  p_raw_token text,
  p_payment_method text DEFAULT 'wallet'
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
  v_user uuid := auth.uid();
  v_inv record;
  v_booking_id uuid;
  v_club_id uuid;
  v_participant_id uuid;
  v_payment text := lower(trim(coalesce(p_payment_method, 'wallet')));
  v_is_wallet boolean;
  v_apply record;
  v_now timestamptz := now();
BEGIN
  IF v_user IS NULL THEN
    RETURN QUERY SELECT false, null::uuid, 'UNAUTHORIZED', 'Connexion requise.';
    RETURN;
  END IF;

  SELECT i.*
  INTO v_inv
  FROM public.booking_participant_invites i
  WHERE i.id = p_invite_id
  FOR UPDATE;

  IF v_inv.id IS NULL THEN
    RETURN QUERY SELECT false, null::uuid, 'NOT_FOUND', 'Invitation introuvable.';
    RETURN;
  END IF;

  IF v_inv.status <> 'pending' OR v_inv.expires_at <= v_now THEN
    RETURN QUERY SELECT false, null::uuid, 'EXPIRED', 'Cette invitation a expiré.';
    RETURN;
  END IF;

  IF v_inv.token_hash <> public.booking_invite_token_hash(p_raw_token) THEN
    RETURN QUERY SELECT false, null::uuid, 'INVALID_TOKEN', 'Lien invalide.';
    RETURN;
  END IF;

  v_booking_id := v_inv.booking_id;
  v_is_wallet := v_payment IN ('wallet', 'online');

  SELECT b.club_id INTO v_club_id
  FROM public.bookings b
  WHERE b.id = v_booking_id
    AND b.status NOT IN ('cancelled', 'completed', 'no_show');

  IF v_club_id IS NULL THEN
    RETURN QUERY SELECT false, null::uuid, 'BOOKING_GONE', 'Réservation indisponible.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.booking_participants bp
    WHERE bp.booking_id = v_booking_id
      AND bp.player_id = v_user
      AND public.is_booking_participant_active(bp.status, bp.created_at)
  ) THEN
    RETURN QUERY SELECT false, null::uuid, 'ALREADY_JOINED', 'Vous êtes déjà sur ce créneau.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.booking_participants bp
    WHERE bp.booking_id = v_booking_id
      AND bp.seat_index = v_inv.seat_index
      AND public.is_booking_participant_active(bp.status, bp.created_at)
  ) THEN
    RETURN QUERY SELECT false, null::uuid, 'SEAT_TAKEN', 'Cette place est déjà prise.';
    RETURN;
  END IF;

  INSERT INTO public.booking_participants (
    booking_id, player_id, seat_index, share_price, payment_method, status
  )
  VALUES (
    v_booking_id, v_user, v_inv.seat_index, v_inv.share_price,
    CASE WHEN v_is_wallet THEN 'wallet' ELSE v_payment END, 'confirmed'
  )
  RETURNING id INTO v_participant_id;

  IF v_is_wallet AND v_inv.share_price > 0 THEN
    SELECT * INTO v_apply
    FROM public.kif_wallet_apply(
      v_user, -v_inv.share_price, 'debit_booking', 'booking_participant', v_participant_id,
      'Réservation terrain (invite)',
      jsonb_build_object('booking_id', v_booking_id, 'invite_id', p_invite_id)
    );

    IF NOT v_apply.ok THEN
      RAISE EXCEPTION 'WALLET_DEBIT_FAILED:%', coalesce(v_apply.error_code, 'INSUFFICIENT_BALANCE');
    END IF;

    UPDATE public.booking_participants
    SET payment_confirmed_at = v_now
    WHERE id = v_participant_id;

    PERFORM public.kif_credit_club_booking_with_commission(
      v_club_id, v_inv.share_price, 'booking_participant', v_participant_id,
      'Jetons KIF — réservation (invite)'
    );
  END IF;

  UPDATE public.booking_participant_invites
  SET status = 'accepted', accepted_at = v_now, accepted_by = v_user, participant_id = v_participant_id
  WHERE id = p_invite_id;

  PERFORM public.refresh_booking_slot_status(v_booking_id);

  RETURN QUERY SELECT true, v_booking_id, null::text, null::text;
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE 'WALLET_DEBIT_FAILED:%' THEN
      RETURN QUERY SELECT false, null::uuid, 'INSUFFICIENT_BALANCE', 'Solde Jetons KIF insuffisant.';
      RETURN;
    END IF;
    RETURN QUERY SELECT false, null::uuid, 'INSERT_FAILED', SQLERRM;
END;
$$;

DROP FUNCTION IF EXISTS public.kif_complete_top_up(uuid);
