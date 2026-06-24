import { NextResponse } from "next/server";

import { parseSetScorePair, type SetScore } from "@/domain/rules/match-score";
import { createSupabaseRouteApiClient } from "@/lib/supabase/route-api";
import { recordMatchResult } from "@/modules/matches/record-match-result-service";

function parseSets(raw: unknown): SetScore[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const sets: SetScore[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as { a?: unknown; b?: unknown };
    const parsed = parseSetScorePair(row.a, row.b);
    if (parsed) {
      sets.push(parsed);
    }
  }
  return sets;
}

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

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const matchId = typeof record.matchId === "string" ? record.matchId : "";
  const locale = typeof record.locale === "string" ? record.locale : "fr";
  const tournamentId =
    typeof record.tournamentId === "string" ? record.tournamentId : undefined;
  const sets = parseSets(record.sets);

  const result = await recordMatchResult(supabase, user.id, {
    locale,
    matchId,
    sets,
    tournamentId,
  });

  const status = result.ok ? 200 : 422;
  return attachCookies(
    NextResponse.json(result, {
      status,
      headers: { "Cache-Control": "no-store" },
    }),
  );
}
