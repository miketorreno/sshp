import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  MissingRuntimeConfigError,
  RUNTIME_VARIABLES,
  requireRuntimeEnv,
} from "@/lib/runtime-env";

/**
 * The build must not need a database or an auth secret, so nothing reads the
 * environment until something is actually being served. These tests watch that
 * boundary from both sides: reading a value is a runtime act, and a runtime act
 * that finds nothing says which variable is missing instead of leaving a library
 * to fail later with a diagnostic nobody can act on.
 */

const saved = new Map<string, string | undefined>();

beforeEach(() => {
  for (const name of RUNTIME_VARIABLES) {
    saved.set(name, process.env[name]);
    delete process.env[name];
  }
});

afterEach(() => {
  for (const [name, value] of saved) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("runtime configuration", () => {
  it("reads the value of the variable that is set", () => {
    process.env.DATABASE_URL = "postgresql://clinic/db";

    expect(requireRuntimeEnv("DATABASE_URL")).toBe("postgresql://clinic/db");
  });

  it("accepts a documented fallback when the preferred variable is unset", () => {
    process.env.AUTH_SECRET = "legacy-secret";

    expect(requireRuntimeEnv("BETTER_AUTH_SECRET", "AUTH_SECRET")).toBe(
      "legacy-secret"
    );
  });

  it("prefers the first variable that is set", () => {
    process.env.AUTH_SECRET = "legacy-secret";
    process.env.BETTER_AUTH_SECRET = "current-secret";

    expect(requireRuntimeEnv("BETTER_AUTH_SECRET", "AUTH_SECRET")).toBe(
      "current-secret"
    );
  });

  it("treats a blank value as unset, because an empty secret is no secret", () => {
    process.env.BETTER_AUTH_SECRET = "   ";

    expect(() => requireRuntimeEnv("BETTER_AUTH_SECRET")).toThrow(
      MissingRuntimeConfigError
    );
  });

  it("names every variable it accepted, so the operator knows what to set", () => {
    const failure = catchFailure(() =>
      requireRuntimeEnv("BETTER_AUTH_SECRET", "AUTH_SECRET")
    );

    expect(failure.variables).toEqual([
      "BETTER_AUTH_SECRET",
      "AUTH_SECRET",
    ]);
    expect(failure.message).toContain("BETTER_AUTH_SECRET");
    expect(failure.message).toContain("AUTH_SECRET");
  });

  it("says the value belongs to the runtime, not the build", () => {
    const failure = catchFailure(() => requireRuntimeEnv("DATABASE_URL"));

    expect(failure.message).toContain("runtime");
    expect(failure.message).toContain("DATABASE_URL");
  });
});

function catchFailure(read: () => unknown): MissingRuntimeConfigError {
  const thrown: unknown = (() => {
    try {
      read();
    } catch (error) {
      return error;
    }
  })();

  expect(thrown).toBeInstanceOf(MissingRuntimeConfigError);

  return thrown as MissingRuntimeConfigError;
}
