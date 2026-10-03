import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { PrismaClient, withAccelerate } = vi.hoisted(() => ({
  PrismaClient: vi.fn(),
  withAccelerate: vi.fn(),
}));

vi.mock("@/generated/prisma", () => ({ PrismaClient }));
vi.mock("@prisma/extension-accelerate", () => ({ withAccelerate }));

import type { MissingRuntimeConfigError } from "@/lib/runtime-env";

/**
 * `next build` imports every server module to collect page data, so a client
 * built while the module is loading is a client that asks the builder for a
 * database it was never given. These tests watch the client being built on first
 * use instead, and watch the one use that cannot be served fail by name.
 *
 * Each test imports the module itself, because the seam memoizes on `globalThis`
 * and a module the runner imported once would leave the first test watching an
 * import that already happened.
 */

const extended = { extended: true };

beforeEach(() => {
  vi.resetModules();
  PrismaClient.mockReset();
  withAccelerate.mockReset();
  PrismaClient.mockImplementation(() => ({
    $extends: () => extended,
  }));
  withAccelerate.mockReturnValue("accelerate");
  process.env.DATABASE_URL = "postgresql://clinic/db";
});

afterEach(() => {
  delete (globalThis as { prisma?: unknown }).prisma;
  delete process.env.DATABASE_URL;
});

describe("database seam", () => {
  it("connects no database while the module is being imported", async () => {
    await import("@/lib/prisma");

    expect(PrismaClient).not.toHaveBeenCalled();
    expect(withAccelerate).not.toHaveBeenCalled();
  });

  it("builds one accelerated client, and hands the same one back every time", async () => {
    const { getPrisma } = await import("@/lib/prisma");

    const first = getPrisma();
    const second = getPrisma();

    expect(first).toBe(extended);
    expect(second).toBe(first);
    expect(PrismaClient).toHaveBeenCalledTimes(1);
    expect(withAccelerate).toHaveBeenCalledTimes(1);
  });

  it("requires the database url before it connects, and names it", async () => {
    delete process.env.DATABASE_URL;

    const [{ getPrisma }, { MissingRuntimeConfigError }] = await Promise.all([
      import("@/lib/prisma"),
      import("@/lib/runtime-env"),
    ]);

    const failure = catchFailure(getPrisma, MissingRuntimeConfigError);

    expect(failure.variables).toEqual(["DATABASE_URL"]);
    expect(failure.message).toContain("DATABASE_URL");
    expect(PrismaClient).not.toHaveBeenCalled();
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
