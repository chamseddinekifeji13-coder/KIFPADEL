import { describe, expect, it } from "vitest";

import { normalizeSignupEmail } from "@/lib/auth/normalize-signup-email";

describe("normalizeSignupEmail", () => {
  it("strips iOS invisible chars and spaces", () => {
    expect(normalizeSignupEmail("  User@Example.com  ")).toBe("user@example.com");
    expect(normalizeSignupEmail("user\u00a0@\u202fexample.com")).toBe("user@example.com");
    expect(normalizeSignupEmail("user\u200b@example.com")).toBe("user@example.com");
  });
});
