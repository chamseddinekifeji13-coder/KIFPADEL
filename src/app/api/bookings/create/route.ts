import { NextResponse } from "next/server";

import { createSupabaseRouteApiClient } from "@/lib/supabase/route-api";
import { createBookingForUser } from "@/modules/bookings/create-booking-service";
import type { CreateBookingInput } from "@/modules/bookings/create-booking-types";

function isCreateBookingInput(body: unknown): body is CreateBookingInput {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.clubId === "string" &&
    typeof b.courtId === "string" &&
    typeof b.startsAt === "string" &&
    typeof b.endsAt === "string" &&
    (b.paymentMethod === "wallet" || b.paymentMethod === "on_site" || b.paymentMethod === "online")
  );
}

export async function POST(request: Request) {
  const { supabase, attachCookies } = await createSupabaseRouteApiClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return attachCookies(
      NextResponse.json(
        {
          ok: false,
          error: "Session expirée. Rechargez la page ou reconnectez-vous.",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      ),
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return attachCookies(
      NextResponse.json(
        { ok: false, error: "Requête invalide.", code: "SERVER_ERROR" },
        { status: 400 },
      ),
    );
  }

  if (!isCreateBookingInput(body)) {
    return attachCookies(
      NextResponse.json(
        { ok: false, error: "Données de réservation incomplètes.", code: "SERVER_ERROR" },
        { status: 400 },
      ),
    );
  }

  const result = await createBookingForUser(supabase, user, {
    clubId: body.clubId,
    courtId: body.courtId,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    paymentMethod: body.paymentMethod,
    racketRentalQty: typeof body.racketRentalQty === "number" ? body.racketRentalQty : undefined,
    clientTotalHint: typeof body.clientTotalHint === "number" ? body.clientTotalHint : undefined,
  });

  const status = result.ok ? 200 : result.code === "UNAUTHORIZED" ? 401 : 422;
  return attachCookies(NextResponse.json(result, { status }));
}
