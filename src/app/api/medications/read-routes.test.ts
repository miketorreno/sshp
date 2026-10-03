import { beforeEach, describe, expect, it, vi } from "vitest";

const { table, getSession } = await vi.hoisted(async () => {
  const { createMedicationTable } = await import(
    "@/server/medications/test-support/medication-table"
  );

  return { table: createMedicationTable(), getSession: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ getPrisma: () => table.prisma }));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import * as medicationRoute from "@/app/api/medications/route";
import { FAILURE_CODES, FAILURE_MESSAGES } from "@/lib/action-result";
import {
  CATALOGUE,
  SESSION,
  archived,
} from "@/server/medications/test-support/seed";

const read = () => medicationRoute.GET();

const UNAUTHENTICATED_BODY = {
  error: {
    code: FAILURE_CODES.UNAUTHENTICATED,
    message: FAILURE_MESSAGES.UNAUTHENTICATED,
  },
};

describe("medication read routes", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    table.seed(CATALOGUE);
  });

  it("serves reads only, with no write methods", () => {
    expect(Object.keys(medicationRoute)).toEqual(["GET"]);
  });

  it("answers with the catalogue a medication request can name", async () => {
    const response = await read();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      { id: "medication-1", name: "Amoxicillin", brandName: "Amoxil" },
      { id: "medication-2", name: "Insulin", brandName: null },
    ]);
  });

  it("leaves an archived medication out of the catalogue", async () => {
    table.seed([...CATALOGUE, archived]);

    const response = await read();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      { id: "medication-1", name: "Amoxicillin", brandName: "Amoxil" },
      { id: "medication-2", name: "Insulin", brandName: null },
    ]);
  });

  it("rejects an unauthenticated read with the stable failure contract", async () => {
    getSession.mockResolvedValue(null);

    const response = await read();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual(UNAUTHENTICATED_BODY);
  });

  it("answers with forbidden for an account that may not read the catalogue", async () => {
    getSession.mockResolvedValue({
      ...SESSION,
      user: { ...SESSION.user, role: "RECEPTIONIST" },
    });

    const response = await read();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: FAILURE_CODES.FORBIDDEN,
        message: FAILURE_MESSAGES.FORBIDDEN,
      },
    });
  });
});
