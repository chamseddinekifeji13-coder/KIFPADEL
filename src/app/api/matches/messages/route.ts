import { NextResponse } from "next/server";

import { createSupabaseRouteApiClient } from "@/lib/supabase/route-api";
import { sendMatchMessage } from "@/modules/matches/send-match-message-service";

export async function POST(request: Request) {
  const { supabase, attachCookies } = await createSupabaseRouteApiClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return attachCookies(
      NextResponse.json({ ok: false, error: "Connexion requise." }, { status: 401 }),
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return attachCookies(
      NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 }),
    );
  }

  const matchId =
    body && typeof body === "object" && "matchId" in body
      ? String((body as { matchId: unknown }).matchId ?? "")
      : "";
  const text =
    body && typeof body === "object" && "body" in body
      ? String((body as { body: unknown }).body ?? "")
      : "";

  const result = await sendMatchMessage(supabase, user.id, { matchId, body: text });
  const status = result.ok ? 200 : 422;

  return attachCookies(
    NextResponse.json(result, {
      status,
      headers: { "Cache-Control": "no-store" },
    }),
  );
}
