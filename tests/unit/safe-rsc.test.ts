import { describe, expect, it } from "vitest";

import { rethrowFrameworkError } from "../../src/lib/utils/safe-rsc";

describe("rethrowFrameworkError", () => {
  it("does nothing for null / undefined / non-objects", () => {
    expect(() => rethrowFrameworkError(null)).not.toThrow();
    expect(() => rethrowFrameworkError(undefined)).not.toThrow();
    expect(() => rethrowFrameworkError("oops")).not.toThrow();
    expect(() => rethrowFrameworkError(42)).not.toThrow();
  });

  it("does nothing for ordinary errors with no digest", () => {
    const err = new Error("boom");
    expect(() => rethrowFrameworkError(err)).not.toThrow();
  });

  it("rethrows DYNAMIC_SERVER_USAGE errors", () => {
    const err = Object.assign(new Error("dynamic"), {
      digest: "DYNAMIC_SERVER_USAGE",
    });
    expect(() => rethrowFrameworkError(err)).toThrow(err);
  });

  it("rethrows NEXT_NOT_FOUND errors", () => {
    const err = Object.assign(new Error("nf"), { digest: "NEXT_NOT_FOUND" });
    expect(() => rethrowFrameworkError(err)).toThrow(err);
  });

  it("rethrows NEXT_REDIRECT errors", () => {
    const err = Object.assign(new Error("rd"), {
      digest: "NEXT_REDIRECT;replace;/foo;307;",
    });
    expect(() => rethrowFrameworkError(err)).toThrow(err);
  });
});
