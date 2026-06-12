import { describe, expect, it } from "vitest";

import {
  BOOKING_SEATS_PER_COURT,
  countActiveBookingParticipants,
  isBookingParticipantActive,
} from "@/domain/rules/booking-participant";

describe("isBookingParticipantActive", () => {
  it("rejects stale pending", () => {
    const old = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    expect(isBookingParticipantActive("pending", old)).toBe(false);
  });

  it("accepts fresh pending", () => {
    expect(isBookingParticipantActive("pending", new Date().toISOString())).toBe(true);
  });

  it("rejects no_show", () => {
    expect(isBookingParticipantActive("no_show", new Date().toISOString())).toBe(false);
  });
});

describe("countActiveBookingParticipants", () => {
  it("counts up to four seats", () => {
    const now = new Date().toISOString();
    const count = countActiveBookingParticipants([
      { status: "confirmed", created_at: now },
      { status: "pending", created_at: now },
      { status: "no_show", created_at: now },
    ]);
    expect(count).toBe(2);
    expect(BOOKING_SEATS_PER_COURT).toBe(4);
  });
});
