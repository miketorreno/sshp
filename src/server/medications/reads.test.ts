import { beforeEach, describe, expect, it, vi } from "vitest";

const { table, getSession } = await vi.hoisted(async () => {
  const { createMedicationTable } = await import(
    "@/server/medications/test-support/medication-table"
  );

  return { table: createMedicationTable(), getSession: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ default: table.prisma }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { FAILURE_CODES } from "@/lib/action-result";
import {
  CATALOGUE,
  SESSION,
  amoxicillin,
  insulin,
  archived,
} from "@/server/medications/test-support/seed";
import { listMedications } from "@/server/medications/reads";

const seed = (rows = CATALOGUE) => table.seed(rows);

describe("medication reads", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    seed();
  });

  it("requires a session to read the catalogue", async () => {
    getSession.mockResolvedValue(null);

    await expect(listMedications()).rejects.toMatchObject({
      name: "UnauthenticatedError",
      failure: { code: FAILURE_CODES.UNAUTHENTICATED },
    });
  });

  it("answers with the medications a request can name, in name order", async () => {
    await expect(listMedications()).resolves.toEqual([
      { id: "medication-1", name: "Amoxicillin", brandName: "Amoxil" },
      { id: "medication-2", name: "Insulin", brandName: null },
    ]);
  });

  it("leaves an archived medication out, because it can no longer be ordered", async () => {
    seed([amoxicillin, insulin, archived]);

    await expect(listMedications()).resolves.toEqual([
      { id: "medication-1", name: "Amoxicillin", brandName: "Amoxil" },
      { id: "medication-2", name: "Insulin", brandName: null },
    ]);
  });
});
