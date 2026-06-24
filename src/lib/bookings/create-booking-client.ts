"use client";

import type { BookingResult, CreateBookingInput } from "@/modules/bookings/create-booking-types";

function isBookingResult(value: unknown): value is BookingResult {
  if (!value || typeof value !== "object" || !("ok" in value)) return false;
  const row = value as BookingResult;
  if (row.ok) {
    return typeof row.bookingId === "string" && row.bookingId.length > 0;
  }
  return typeof row.error === "string";
}

/**
 * Réservation via route API (fiable sur iOS WebKit ; évite les server actions POST).
 */
export async function createBookingViaApi(input: CreateBookingInput): Promise<BookingResult> {
  let response: Response;
  try {
    response = await fetch("/api/bookings/create", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[createBookingViaApi] network", err);
    return {
      ok: false,
      error: "Connexion interrompue. Vérifiez le réseau et réessayez.",
      code: "SERVER_ERROR",
    };
  }

  let payload: unknown = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();
    } catch (err) {
      console.error("[createBookingViaApi] json parse", err);
    }
  }

  if (isBookingResult(payload)) {
    return payload;
  }

  if (!response.ok) {
    return {
      ok: false,
      error: `Erreur serveur (${response.status}). Rechargez la page puis réessayez.`,
      code: "SERVER_ERROR",
    };
  }

  return {
    ok: false,
    error: "Réponse serveur inattendue. Rechargez la page puis réessayez.",
    code: "SERVER_ERROR",
  };
}
