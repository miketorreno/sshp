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
  addVitals,
  archiveVitals,
  restoreVitals,
} from "@/app/actions/vitals-actions";
import { FAILURE_CODES, FAILURE_MESSAGES } from "@/lib/action-result";
import {
  SESSION,
  seedVisits,
  visit,
  vitals,
} from "@/server/visits/test-support/seed";

const seed = (rows?: Parameters<typeof seedVisits>[1]) =>
  seedVisits(table, rows);

/** Only an administrator restores; see ADR 0005. */
const ADMIN = {
  ...SESSION,
  user: { ...SESSION.user, role: "ADMIN" },
};

const ARCHIVED_AT = new Date("2026-04-01T08:00:00.000Z");

function vitalsForm(overrides: Record<string, string> = {}) {
  const form = new FormData();

  for (const [name, value] of Object.entries({
    id: "visit-1",
    recordedAt: "2026-03-02T09:40",
    height: "165",
    weight: "60",
    systolicBP: "110",
    diastolicBP: "70",
    heartRate: "68",
    temperatureCelsius: "36.5",
    respiratoryRate: "14",
    oxygenSaturation: "99",
    glucose: "",
    cholesterol: "",
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

describe("vitals form commands", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    seed({ vitals: [vitals()] });
    revalidatePath.mockReset();
  });

  it("refuses both commands without a session", async () => {
    getSession.mockResolvedValue(null);

    await expect(addVitals(vitalsForm())).resolves.toEqual(signedOut);
    await expect(archiveVitals("visit-1", "vitals-1")).resolves.toEqual(
      signedOut,
    );

    expect(table.vitals).toEqual([vitals()]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a measurement that is not a number, naming that box", async () => {
    const result = await addVitals(vitalsForm({ height: "tall" }));

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: FAILURE_CODES.INVALID_INPUT,
        fieldErrors: expect.objectContaining({ height: ["Enter a number"] }),
      },
    });
    expect(table.vitals).toHaveLength(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("records the vitals against the visit the form addresses and reports it", async () => {
    const result = await addVitals(vitalsForm());

    expect(result).toMatchObject({ ok: true, data: { id: "visit-vitals-2" } });
    expect(table.vitals[1]).toMatchObject({
      visitId: "visit-1",
      recordedById: "user-1",
      height: 165,
      weight: 60,
      glucose: null,
      cholesterol: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/visits/visit-1");
  });

  it("keeps a recorded zero as zero", async () => {
    const result = await addVitals(vitalsForm({ weight: "0" }));

    expect(result).toMatchObject({ ok: true });
    expect(table.vitals[1]?.weight).toBe(0);
  });

  it("records against the addressed visit, not one named in the submission", async () => {
    const form = vitalsForm();
    form.set("visitId", "visit-2");

    await addVitals(form);

    expect(table.vitals[1]?.visitId).toBe("visit-1");
  });

  it("keeps vitals recorded during another visit out of reach", async () => {
    const other = { ...vitals(), id: "vitals-2", visitId: "visit-2" };
    seed({
      visits: [visit(), visit({ id: "visit-2" })],
      vitals: [vitals(), other],
    });

    await expect(archiveVitals("visit-1", "vitals-2")).resolves.toMatchObject({
      ok: false,
      error: { code: FAILURE_CODES.NOT_FOUND },
    });
    expect(table.findVitals("vitals-2")?.deletedAt).toBeNull();
  });

  it("archives the vitals and reports it, so the visit read can be invalidated", async () => {
    const result = await archiveVitals("visit-1", "vitals-1");

    expect(result).toMatchObject({ ok: true, data: { id: "vitals-1" } });
    expect(table.findVitals("vitals-1")?.deletedAt).toBeInstanceOf(Date);
    expect(table.destroyed).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith(`/visits/visit-1`);
  });
  describe("restore", () => {
    it("restores the reading into the visit it was taken during", async () => {
      getSession.mockResolvedValue(ADMIN);
      // A fresh row each time: a command restores the row it finds in place, so a
      // shared fixture would come back already restored for the next case.
      seed({
        visits: [visit()],
        vitals: [vitals({ deletedAt: ARCHIVED_AT })],
      });

      const result = await restoreVitals("visit-1", "vitals-1");

      expect(result).toMatchObject({ ok: true, data: { id: "vitals-1" } });
      expect(table.findVitals("vitals-1")?.deletedAt).toBeNull();
      expect(revalidatePath.mock.calls.flat()).toEqual(["/visits/visit-1"]);
    });

    it("refuses a clinician, who may archive a reading but not bring one back", async () => {
      getSession.mockResolvedValue(ADMIN);
      seed({
        visits: [visit()],
        vitals: [vitals({ deletedAt: ARCHIVED_AT })],
      });
      getSession.mockResolvedValue(SESSION);

      await expect(restoreVitals("visit-1", "vitals-1")).resolves.toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.FORBIDDEN,
          message: FAILURE_MESSAGES.FORBIDDEN,
        },
      });
      expect(table.findVitals("vitals-1")?.deletedAt).toEqual(ARCHIVED_AT);
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("reports a reading whose visit is still archived", async () => {
      // The visit comes back before the reading does, so this refusal is what the
      // archive screen leads with: restore the visit first.
      getSession.mockResolvedValue(ADMIN);
      seed({
        visits: [visit({ deletedAt: ARCHIVED_AT })],
        vitals: [vitals({ deletedAt: ARCHIVED_AT })],
      });

      await expect(restoreVitals("visit-1", "vitals-1")).resolves.toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.NOT_FOUND,
          message: "Vitals are recorded against a visit that is still active.",
        },
      });
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });
});
