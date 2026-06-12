export type BookingRpcRow = {
  ok?: boolean | string | number | null;
  booking_id?: string | null;
  error_code?: string | null;
  error_message?: string | null;
};

function pickScalar(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    const asString = String(value).trim();
    if (asString) return asString;
  }
  return null;
}

function normalizeBookingRpcRow(raw: Record<string, unknown>): BookingRpcRow {
  return {
    ok: raw.ok as BookingRpcRow["ok"],
    booking_id: pickScalar(raw, ["booking_id", "bookingId", "bookingID", "id"]),
    error_code: pickScalar(raw, ["error_code", "errorCode"]),
    error_message: pickScalar(raw, ["error_message", "errorMessage"]),
  };
}

export function parseBookingRpcRow(data: unknown): BookingRpcRow | null {
  if (Array.isArray(data)) {
    const row = data[0];
    return row && typeof row === "object" ? normalizeBookingRpcRow(row as Record<string, unknown>) : null;
  }
  if (data && typeof data === "object") {
    return normalizeBookingRpcRow(data as Record<string, unknown>);
  }
  return null;
}

export function isBookingRpcOk(ok: BookingRpcRow["ok"]): boolean {
  if (ok === false || ok === "false" || ok === "f" || ok === 0 || ok === "0") {
    return false;
  }
  return ok === true || ok === "true" || ok === "t" || ok === 1 || ok === "1";
}

/** Succès si `booking_id` présent ou `ok` explicite. */
export function isBookingRpcSuccess(row: BookingRpcRow | null): boolean {
  if (!row) return false;
  if (row.booking_id) return true;
  return isBookingRpcOk(row.ok);
}
