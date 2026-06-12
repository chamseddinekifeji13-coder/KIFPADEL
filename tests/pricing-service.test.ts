import { describe, expect, it } from "vitest";

import { resolveCourtPlayerPrice } from "@/domain/rules/court-pricing";
import { computeBookingTotals } from "@/modules/bookings/pricing-service";

describe("resolveCourtPlayerPrice", () => {
  it("prefers price_per_player", () => {
    expect(resolveCourtPlayerPrice({ price_per_player: 12, price_per_slot: 40 })).toBe(12);
  });

  it("falls back to slot / 4", () => {
    expect(resolveCourtPlayerPrice({ price_per_slot: 40 })).toBe(10);
  });
});

describe("computeBookingTotals", () => {
  it("charges per player plus one racket", () => {
    const totals = computeBookingTotals({
      club: { racket_rental_enabled: true, racket_rental_price_per_unit: 5 },
      court: { price_per_player: 10 },
      startsAt: "2026-06-12T10:00:00Z",
      endsAt: "2026-06-12T11:30:00Z",
      racketRentalQtyRequested: 1,
    });

    expect(totals.basePrice).toBe(10);
    expect(totals.racketFee).toBe(5);
    expect(totals.totalPrice).toBe(15);
    expect(totals.racketRentalQty).toBe(1);
  });

  it("caps racket qty to 1", () => {
    const totals = computeBookingTotals({
      club: { racket_rental_enabled: true, racket_rental_price_per_unit: 5 },
      court: { price_per_player: 10 },
      startsAt: "2026-06-12T10:00:00Z",
      endsAt: "2026-06-12T11:30:00Z",
      racketRentalQtyRequested: 4,
    });

    expect(totals.racketRentalQty).toBe(1);
    expect(totals.totalPrice).toBe(15);
  });
});
