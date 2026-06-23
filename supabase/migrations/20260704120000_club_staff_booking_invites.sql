-- Invitations émises par le staff club (résa téléphone) : paiement sur place sans Jetons KIF.

ALTER TABLE public.booking_participant_invites
  ADD COLUMN IF NOT EXISTS invite_source text NOT NULL DEFAULT 'player'
    CHECK (invite_source IN ('player', 'club'));

COMMENT ON COLUMN public.booking_participant_invites.invite_source IS
  'player = organisateur joueur ; club = lien envoyé par le gérant (résa téléphone).';

CREATE OR REPLACE FUNCTION public.create_club_booking_split_invites(p_booking_id uuid)
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

  IF NOT public.has_club_role(
    v_club_id,
    ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
  ) AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'NOT_CLUB_STAFF';
  END IF;

  SELECT coalesce(c.split_payment_deadline_hours, 24)
  INTO v_deadline_hours
  FROM public.clubs c
  WHERE c.id = v_club_id;

  v_expires := now() + make_interval(hours => v_deadline_hours);

  SELECT coalesce(
    (
      SELECT bp.share_price
      FROM public.booking_participants bp
      WHERE bp.booking_id = p_booking_id
        AND public.is_booking_participant_active(bp.status, bp.created_at)
      ORDER BY bp.created_at
      LIMIT 1
    ),
    (SELECT b.total_price FROM public.bookings b WHERE b.id = p_booking_id),
    0
  )
  INTO v_share;

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
      expires_at,
      invite_source
    )
    VALUES (
      p_booking_id,
      v_seat::smallint,
      v_user,
      v_share,
      v_hash,
      v_expires,
      'club'
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

CREATE OR REPLACE FUNCTION public.refresh_club_booking_split_invite_links(p_booking_id uuid)
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

  IF NOT public.has_club_role(
    v_club_id,
    ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
  ) AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'NOT_CLUB_STAFF';
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
      invited_by = v_user,
      invite_source = 'club'
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

GRANT EXECUTE ON FUNCTION public.create_club_booking_split_invites(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_club_booking_split_invite_links(uuid) TO authenticated;

DROP POLICY IF EXISTS "booking_invites_select_club_staff" ON public.booking_participant_invites;
CREATE POLICY "booking_invites_select_club_staff"
  ON public.booking_participant_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = booking_participant_invites.booking_id
        AND public.has_club_role(
          b.club_id,
          ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
        )
    )
    OR public.is_super_admin()
  );
