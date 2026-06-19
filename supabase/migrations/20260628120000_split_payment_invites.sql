-- Paiement partagé : invites par place + expiration automatique.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS split_payment_deadline_hours smallint NOT NULL DEFAULT 24
    CHECK (split_payment_deadline_hours >= 1 AND split_payment_deadline_hours <= 168);

COMMENT ON COLUMN public.clubs.split_payment_deadline_hours IS
  'Délai (heures) pour qu''un co-joueur invité paie sa part avant expiration de l''invite.';

CREATE TABLE IF NOT EXISTS public.booking_participant_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  seat_index smallint NOT NULL CHECK (seat_index BETWEEN 1 AND 4),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_price numeric(12, 2) NOT NULL,
  token_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  participant_id uuid REFERENCES public.booking_participants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, seat_index),
  UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_booking_invites_booking
  ON public.booking_participant_invites (booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_invites_expires_pending
  ON public.booking_participant_invites (expires_at)
  WHERE status = 'pending';

COMMENT ON TABLE public.booking_participant_invites IS
  'Places réservées via lien de paiement partagé (organisateur → co-joueurs).';

CREATE OR REPLACE FUNCTION public.is_seat_reserved_by_invite(
  p_booking_id uuid,
  p_seat_index smallint
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

CREATE OR REPLACE FUNCTION public.count_booking_slot_occupancy(p_booking_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      SELECT count(*)::integer
      FROM public.booking_participants bp
      WHERE bp.booking_id = p_booking_id
        AND public.is_booking_participant_active(bp.status, bp.created_at)
    )
    + (
      SELECT count(*)::integer
      FROM public.booking_participant_invites inv
      WHERE inv.booking_id = p_booking_id
        AND inv.status = 'pending'
        AND inv.expires_at > now()
    );
$$;

CREATE OR REPLACE FUNCTION public.booking_invite_token_hash(p_raw_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.digest('kifpadel-booking-invite:' || coalesce(p_raw_token, ''), 'sha256'), 'hex');
$$;

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
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_club_id uuid;
  v_deadline_hours integer;
  v_expires timestamptz;
  v_share numeric(12, 2);
  v_seat smallint;
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
    AND b.status NOT IN ('cancelled', 'completed', 'no_show');

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
    v_raw := encode(gen_random_bytes(24), 'hex');
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
      v_seat,
      v_user,
      v_share,
      v_hash,
      v_expires
    )
    RETURNING id INTO v_invite_id;

  invite_id := v_invite_id;
  seat_index := v_seat;
  invite_token := v_raw;
  share_price := v_share;
  expires_at := v_expires;
  RETURN NEXT;
  END LOOP;

  PERFORM public.refresh_booking_slot_status(p_booking_id);
END;
$$;

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
  v_inv public.booking_participant_invites%ROWTYPE;
  v_booking_id uuid;
  v_club_id uuid;
  v_payment text := lower(trim(coalesce(p_payment_method, 'wallet')));
  v_is_wallet boolean;
  v_participant_id uuid;
  v_apply record;
  v_now timestamptz := now();
BEGIN
  IF v_user IS NULL THEN
    RETURN QUERY SELECT false, null::uuid, 'UNAUTHORIZED', 'Connexion requise.';
    RETURN;
  END IF;

  SELECT * INTO v_inv
  FROM public.booking_participant_invites
  WHERE id = p_invite_id
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
    booking_id,
    player_id,
    seat_index,
    share_price,
    payment_method,
    status
  )
  VALUES (
    v_booking_id,
    v_user,
    v_inv.seat_index,
    v_inv.share_price,
    CASE WHEN v_is_wallet THEN 'wallet' ELSE v_payment END,
    'confirmed'
  )
  RETURNING id INTO v_participant_id;

  IF v_is_wallet AND v_inv.share_price > 0 THEN
    SELECT * INTO v_apply
    FROM public.kif_wallet_apply(
      v_user,
      -v_inv.share_price,
      'debit_booking',
      'booking_participant',
      v_participant_id,
      'Réservation terrain (invite)',
      jsonb_build_object('booking_id', v_booking_id, 'invite_id', p_invite_id)
    );

    IF NOT v_apply.ok THEN
      RAISE EXCEPTION 'WALLET_DEBIT_FAILED:%', coalesce(v_apply.error_code, 'INSUFFICIENT_BALANCE');
    END IF;

    UPDATE public.booking_participants
    SET payment_confirmed_at = v_now
    WHERE id = v_participant_id;

    INSERT INTO public.kif_club_ledger (club_id, amount, type, reference_type, reference_id, description)
    VALUES (v_club_id, v_inv.share_price, 'credit_booking', 'booking_participant', v_participant_id, 'Jetons KIF — réservation (invite)');
  END IF;

  UPDATE public.booking_participant_invites
  SET
    status = 'accepted',
    accepted_at = v_now,
    accepted_by = v_user,
    participant_id = v_participant_id
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

CREATE OR REPLACE FUNCTION public.expire_stale_booking_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_booking_id uuid;
  v_ids uuid[];
BEGIN
  SELECT array_agg(DISTINCT inv.booking_id)
  INTO v_ids
  FROM public.booking_participant_invites inv
  WHERE inv.status = 'pending'
    AND inv.expires_at < now();

  UPDATE public.booking_participant_invites
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_ids IS NOT NULL THEN
    FOREACH v_booking_id IN ARRAY v_ids
    LOOP
      PERFORM public.refresh_booking_slot_status(v_booking_id);
    END LOOP;
  END IF;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_split_invites(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_booking_invite_atomic(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.booking_invite_token_hash(text) TO authenticated;

ALTER TABLE public.booking_participant_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_invites_select_participants" ON public.booking_participant_invites;
CREATE POLICY "booking_invites_select_participants"
  ON public.booking_participant_invites
  FOR SELECT
  USING (
    invited_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.booking_participants bp
      WHERE bp.booking_id = booking_participant_invites.booking_id
        AND bp.player_id = auth.uid()
        AND public.is_booking_participant_active(bp.status, bp.created_at)
    )
    OR (status = 'pending' AND expires_at > now())
  );

-- Mise à jour create_booking_atomic : respecter les places réservées par invite.
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
      AND b.is_blocking = true
      AND b.status NOT IN ('cancelled', 'completed', 'no_show')
      AND tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) THEN
    RETURN QUERY SELECT false, NULL::uuid, 'SLOT_TAKEN', 'Slot is full (4 players).';
    RETURN;
  END IF;

  SELECT b.id
  INTO v_booking_id
  FROM public.bookings b
  WHERE b.court_id = p_court_id
    AND b.starts_at = p_starts_at
    AND b.ends_at = p_ends_at
    AND b.status NOT IN ('cancelled', 'completed', 'no_show')
  ORDER BY b.created_at
  LIMIT 1
  FOR UPDATE;

  IF v_booking_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.booking_participants bp
      WHERE bp.booking_id = v_booking_id
        AND bp.player_id = p_player_id
        AND public.is_booking_participant_active(bp.status, bp.created_at)
    ) THEN
      RETURN QUERY SELECT false, NULL::uuid, 'ALREADY_JOINED', 'You already joined this slot.';
      RETURN;
    END IF;

    v_active_count := public.count_booking_slot_occupancy(v_booking_id);
    IF v_active_count >= 4 THEN
      RETURN QUERY SELECT false, NULL::uuid, 'SLOT_TAKEN', 'Slot is full (4 players).';
      RETURN;
    END IF;
  ELSE
    BEGIN
      EXECUTE format(
        'INSERT INTO public.bookings (club_id, court_id, %I, starts_at, ends_at, status, total_price, payment_method, racket_rental_qty, racket_rental_fee, is_blocking)
         VALUES ($1, $2, $3, $4, $5, ''confirmed'', $6, $7, $8, $9, false)
         RETURNING id',
        v_actor_col
      )
      INTO v_booking_id
      USING p_club_id, p_court_id, p_player_id, p_starts_at, p_ends_at, v_share,
        CASE WHEN v_is_wallet THEN 'wallet' ELSE p_payment_method END,
        v_qty, v_fee;
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
    AND NOT public.is_seat_reserved_by_invite(v_booking_id, gs.seat)
    ORDER BY gs.seat
    LIMIT 1
  ) s;

  IF v_seat IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'SLOT_TAKEN', 'No seat available.';
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.booking_participants (
      booking_id,
      player_id,
      seat_index,
      share_price,
      payment_method,
      racket_rental_qty,
      racket_rental_fee,
      status
    )
    VALUES (
      v_booking_id,
      p_player_id,
      v_seat,
      v_share,
      CASE WHEN v_is_wallet THEN 'wallet' ELSE p_payment_method END,
      v_qty,
      v_fee,
      v_participant_status
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
      p_player_id,
      -v_share,
      'debit_booking',
      'booking_participant',
      v_participant_id,
      'Réservation terrain',
      jsonb_build_object('booking_id', v_booking_id, 'club_id', p_club_id)
    );

    IF NOT v_apply.ok THEN
      RAISE EXCEPTION 'WALLET_DEBIT_FAILED:%', coalesce(v_apply.error_code, 'INSUFFICIENT_BALANCE');
    END IF;

    UPDATE public.booking_participants
    SET payment_confirmed_at = v_now
    WHERE id = v_participant_id;

    INSERT INTO public.kif_club_ledger (club_id, amount, type, reference_type, reference_id, description)
    VALUES (p_club_id, v_share, 'credit_booking', 'booking_participant', v_participant_id, 'Jetons KIF — réservation');
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

-- Cron : expiration des invites impayées (toutes les 5 min).
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'kifpadel_expire_booking_invites';

    PERFORM cron.schedule(
      'kifpadel_expire_booking_invites',
      '*/5 * * * *',
      $$SELECT public.expire_stale_booking_invites();$$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $cron$;
