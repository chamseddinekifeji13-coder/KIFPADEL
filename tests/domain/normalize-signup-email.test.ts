import { describe, expect, it } from "vitest";

import { normalizeSignupEmail, normalizeSignupPassword } from "@/lib/auth/normalize-signup-email";

describe("normalizeSignupEmail", () => {
  it("strips iOS invisible chars and spaces", () => {
    expect(normalizeSignupEmail("  User@Example.com  ")).toBe("user@example.com");
    expect(normalizeSignupEmail("user\u00a0@\u202fexample.com")).toBe("user@example.com");
    expect(normalizeSignupEmail("user\u200b@example.com")).toBe("user@example.com");
  });
});

describe("normalizeSignupPassword", () => {
  it("strips iOS invisible chars and surrounding whitespace", () => {
    expect(normalizeSignupPassword("  Secret123!  ")).toBe("Secret123!");
    expect(normalizeSignupPassword("Secret123!\n")).toBe("Secret123!");
    expect(normalizeSignupPassword("Secret\u200b123!")).toBe("Secret123!");
  });
});
