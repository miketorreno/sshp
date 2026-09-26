import { beforeEach, describe, expect, it, vi } from "vitest";

const { table, getSession, revalidatePath } = await vi.hoisted(async () => {
  const { createVisitTable } = await import(
    "@/server/visits/test-support/visit-table"
  );

  return {
    table: createVisitTable(),
    getSession: vi.fn(),
    revalidatePath: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ getPrisma: () => table.prisma }));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath }));

import {
  checkoutVisit,
  createVisit,
  deleteVisit,
  updateVisit,
} from "@/app/actions/visit-actions";
import { FAILURE_CODES, FAILURE_MESSAGES } from "@/lib/action-result";
import { SESSION, seedVisits, visit } from "@/server/visits/test-support/seed";

const seed = (rows?: Parameters<typeof seedVisits>[1]) =>
  seedVisits(table, rows);

function visitForm(overrides: Record<string, string> = {}) {
  const form = new FormData();

  for (const [name, value] of Object.entries({
    id: "",
    patientId: "patient-1",
    startDateTime: "2026-03-02T09:00",
    visitType: "CLINIC",
    reason: "Annual check",
    ...overrides,
  })) {
    form.append(name, value);
  }

  return form;
}

const signedOut = {
  ok: false,
  error: {
    code: FAILURE_CODES.UNAUTHENTICATED,
    message: FAILURE_MESSAGES.UNAUTHENTICATED,
  },
};

describe("visit form commands", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    seed();
    revalidatePath.mockReset();
  });

  it("refuses every command without a session", async () => {
    getSession.mockResolvedValue(null);

    await expect(createVisit(visitForm())).resolves.toEqual(signedOut);
    await expect(updateVisit(visitForm({ id: "visit-1" }))).resolves.toEqual(
      signedOut,
    );
    await expect(checkoutVisit("visit-1")).resolves.toEqual(signedOut);
    await expect(deleteVisit("visit-1")).resolves.toEqual(signedOut);

    expect(table.visits).toEqual([visit()]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  describe("create", () => {
    it("rejects a submission with no patient, without writing", async () => {
      const result = await createVisit(visitForm({ patientId: "" }));

      expect(result).toMatchObject({
        ok: false,
        error: {
          code: FAILURE_CODES.INVALID_INPUT,
          fieldErrors: expect.objectContaining({
            patientId: ["Select a patient"],
          }),
        },
      });
      expect(table.visits).toEqual([visit()]);
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("writes the parsed input and reports the visit, so the client can open it", async () => {
      const result = await createVisit(
        visitForm({
          startDateTime: "2026-03-05T11:00",
          visitType: "FOLLOWUP",
        }),
      );

      expect(result).toMatchObject({ ok: true });
      const created = table.visits[1];

      expect(created).toMatchObject({
        patientId: "patient-1",
        providerId: "user-1",
        createdById: "user-1",
        startDateTime: new Date("2026-03-05T11:00:00"),
        visitType: "FOLLOWUP",
      });
      expect(result.ok && result.data.id).toBe(created?.id);
      expect(revalidatePath).toHaveBeenCalledWith("/patients/outpatients");
      expect(revalidatePath).toHaveBeenCalledWith(`/visits/${created?.id}`);
    });
  });

  describe("update", () => {
    it("rejects a submission without a visit id", async () => {
      const result = await updateVisit(visitForm({ id: "" }));

      expect(result).toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.INVALID_INPUT },
      });
      expect(table.findVisit("visit-1")).toEqual(visit());
    });

    it("updates the addressed visit, revalidating the clinic day and the visit", async () => {
      const result = await updateVisit(
        visitForm({ id: "visit-1", startDateTime: "2026-03-06T11:00" }),
      );

      expect(result).toMatchObject({ ok: true, data: { id: "visit-1" } });
      expect(table.findVisit("visit-1")).toMatchObject({
        startDateTime: new Date("2026-03-06T11:00:00"),
        updatedById: "user-1",
        patientId: "patient-1",
      });
      expect(revalidatePath).toHaveBeenCalledWith("/patients/outpatients");
      expect(revalidatePath).toHaveBeenCalledWith("/visits/visit-1");
    });

    it("reports an unknown visit as not found", async () => {
      await expect(
        updateVisit(visitForm({ id: "visit-404" })),
      ).resolves.toEqual({
        ok: false,
        error: { code: FAILURE_CODES.NOT_FOUND, message: "Visit not found" },
      });
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("checkout", () => {
    it("ends the visit and reports it, so the page stays where it is", async () => {
      const result = await checkoutVisit("visit-1");

      expect(result).toMatchObject({ ok: true, data: { id: "visit-1" } });
      expect(table.findVisit("visit-1")?.endDateTime).toBeInstanceOf(Date);
      expect(revalidatePath).toHaveBeenCalledWith("/patients/outpatients");
      expect(revalidatePath).toHaveBeenCalledWith("/visits/visit-1");
    });
  });

  describe("archive", () => {
    it("archives the visit and reports it, so the client can invalidate", async () => {
      const result = await deleteVisit("visit-1");

      expect(result).toMatchObject({ ok: true, data: { id: "visit-1" } });
      expect(table.findVisit("visit-1")?.deletedAt).toBeInstanceOf(Date);
      expect(table.destroyed).toEqual([]);
      expect(revalidatePath).toHaveBeenCalledWith("/visits/visit-1");
    });
  });
});
