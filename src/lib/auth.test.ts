import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { betterAuth, getPrisma } = vi.hoisted(() => ({
  betterAuth: vi.fn(),
  getPrisma: vi.fn(),
}));

vi.mock("better-auth", () => ({ betterAuth }));
vi.mock("@/lib/prisma", () => ({ getPrisma }));

import { MissingRuntimeConfigError } from "@/lib/runtime-env";

/**
 * Building the auth system is what made the builder demand a secret and a
 * database: `betterAuth()` reads both while it is being constructed, and
 * `next build` constructs it because it imports every server module to collect
 * page data. These tests watch construction happen on the first authenticated
 * request instead, and watch the runtime still refuse to serve without a secret.
 *
 * Each test re-imports the module because the seam memoizes per process, which
 * is the behaviour the third test is about.
 */

const SECRET = "a-secret-long-enough-to-satisfy-the-library";

beforeEach(() => {
  vi.resetModules();
  betterAuth.mockReset();
  getPrisma.mockReset();
  betterAuth.mockImplementation(() => auth);
  getPrisma.mockImplementation(() => ({ database: true }));
  process.env.BETTER_AUTH_SECRET = SECRET;
});

afterEach(() => {
  delete (globalThis as { auth?: unknown }).auth;
  delete process.env.BETTER_AUTH_SECRET;
  delete process.env.AUTH_SECRET;
});

const auth = { api: { getSession: vi.fn() } };

describe("auth seam", () => {
  it("builds no auth system and reaches no database while being imported", async () => {
    await import("@/lib/auth");

    expect(betterAuth).not.toHaveBeenCalled();
    expect(getPrisma).not.toHaveBeenCalled();
  });

  it("builds the auth system on first use, and hands back the same one after", async () => {
    const { getAuth } = await import("@/lib/auth");

    const first = getAuth();
    const second = getAuth();

    expect(first).toBe(auth);
    expect(second).toBe(first);
    expect(getPrisma).toHaveBeenCalledTimes(1);
    expect(betterAuth).toHaveBeenCalledTimes(1);
  });

  it("requires the auth secret before it builds, and names it", async () => {
    delete process.env.BETTER_AUTH_SECRET;

    // Both come from the module registry this test reset, so the class the
    // failure was built from is the one asserted on.
    const [{ getAuth }, { MissingRuntimeConfigError }] = await Promise.all([
      import("@/lib/auth"),
      import("@/lib/runtime-env"),
    ]);

    const failure = catchFailure(getAuth, MissingRuntimeConfigError);

    expect(failure.variables).toEqual(["BETTER_AUTH_SECRET", "AUTH_SECRET"]);
    expect(failure.message).toContain("BETTER_AUTH_SECRET");
    expect(betterAuth).not.toHaveBeenCalled();
  });

  it("finds the auth secret under either name when only the fallback is set", async () => {
    delete process.env.BETTER_AUTH_SECRET;
    process.env.AUTH_SECRET = "legacy-secret";

    const { getAuth } = await import("@/lib/auth");

    expect(getAuth()).toBe(auth);
  });
});

function catchFailure(
  read: () => unknown,
  Failure: new (...args: never[]) => MissingRuntimeConfigError
): MissingRuntimeConfigError {
  const thrown: unknown = (() => {
    try {
      read();
    } catch (error) {
      return error;
    }
  })();

  expect(thrown).toBeInstanceOf(Failure);

  return thrown as MissingRuntimeConfigError;
}
