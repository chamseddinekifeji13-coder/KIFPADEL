import { describe, expect, it } from "vitest";

import {
  buildTunisSlotTimestamps,
  formatTunisHm,
  isValidYmdDate,
  normalizeTimeHm,
} from "@/modules/bookings/timezone";

describe("booking timezone (iOS-safe)", () => {
  it("normalizes colon and h-formats", () => {
    expect(normalizeTimeHm("9:30")).toBe("09:30");
    expect(normalizeTimeHm("09:30")).toBe("09:30");
    expect(normalizeTimeHm("9 h 30")).toBe("09:30");
    expect(normalizeTimeHm("9\u202fh\u202f30")).toBe("09:30");
  });

  it("formats Tunis hours with stable en-GB parts", () => {
    const utc = new Date("2025-06-24T08:00:00.000Z");
    expect(formatTunisHm(utc)).toBe("09:00");
  });

  it("builds slot timestamps from normalized time", () => {
    const { startsAtIso, endsAtIso } = buildTunisSlotTimestamps("2025-06-24", "18:00", 90);
    expect(startsAtIso).toBe("2025-06-24T17:00:00.000Z");
    expect(endsAtIso).toBe("2025-06-24T18:30:00.000Z");
  });

  it("validates YYYY-MM-DD without throwing", () => {
    expect(isValidYmdDate("2025-06-24")).toBe(true);
    expect(isValidYmdDate("invalid")).toBe(false);
    expect(isValidYmdDate("2025-13-40")).toBe(true);
  });
});
