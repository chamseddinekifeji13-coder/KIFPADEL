import { describe, expect, it } from "vitest";

import {
  formatAmountDt,
  formatBookingSchedule,
  formatPaymentMethodLabel,
} from "@/modules/notifications/booking-format";
import { resolveWhatsAppTarget } from "@/lib/phone/resolve-whatsapp-target";

describe("formatBookingSchedule", () => {
  it("formats Tunis timezone range", () => {
    const { dateLine, timeRange } = formatBookingSchedule(
      "2026-06-15T07:00:00.000Z",
      "2026-06-15T08:00:00.000Z",
      "fr",
    );
    expect(dateLine.length).toBeGreaterThan(5);
    expect(timeRange).toMatch(/\d{2}:\d{2}–\d{2}:\d{2}/);
  });
});

describe("formatPaymentMethodLabel", () => {
  it("labels on_site in French", () => {
    expect(formatPaymentMethodLabel("on_site", "fr")).toBe("Sur place au club");
  });

  it("labels online in French", () => {
    expect(formatPaymentMethodLabel("online", "fr")).toContain("ligne");
  });
});

describe("formatAmountDt", () => {
  it("formats integers without decimals", () => {
    expect(formatAmountDt(10)).toBe("10");
  });
});

describe("resolveWhatsAppTarget", () => {
  it("normalizes Tunisia local number", () => {
    expect(resolveWhatsAppTarget("22 123 456")).toBe("+21622123456");
  });
});
