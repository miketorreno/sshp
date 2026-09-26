import { beforeEach, describe, expect, it, vi } from "vitest";

const { table, getSession } = await vi.hoisted(async () => {
  const { createVisitTable } = await import(
    "@/server/visits/test-support/visit-table"
  );

  return { table: createVisitTable(), getSession: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ default: table.prisma }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { FAILURE_CODES } from "@/lib/action-result";
import {
  CHECKED_OUT,
  PATIENT,
  SESSION,
  STARTED,
  seedVisits,
  visit,
} from "@/server/visits/test-support/seed";
import {
  checkoutVisit,
  createVisit,
  deleteVisit,
  updateVisit,
  type VisitInput,
} from "@/server/visits/commands";

const ARCHIVED = new Date("2026-02-01T00:00:00.000Z");

const input = (overrides: Partial<VisitInput> = {}): VisitInput => ({
  patientId: "patient-1",
  visitType: "CLINIC",
  startDateTime: STARTED,
  reason: "Annual check",
  ...overrides,
});

const seed = (rows?: Parameters<typeof seedVisits>[1]) =>
  seedVisits(table, rows);

describe("visit commands", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    seed();
  });

  describe("create", () => {
    it("refuses a write with no session", async () => {
      getSession.mockResolvedValue(null);

      await expect(createVisit(input())).resolves.toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.UNAUTHENTICATED },
      });
      expect(table.visits).toHaveLength(1);
    });

    it("refuses to open a visit for a patient who is not active", async () => {
      const archived = { ...PATIENT, id: "patient-9", deletedAt: ARCHIVED };
      seed({ patients: [archived] });

      await expect(
        createVisit(input({ patientId: "patient-9" })),
      ).resolves.toMatchObject({
        ok: false,
        error: { message: "The selected patient is not an active patient." },
      });
      expect(table.visits).toHaveLength(1);
    });

    it("records who opened the visit and who is looking after it", async () => {
      const result = await createVisit(input());

      expect(result).toMatchObject({ ok: true });
      const created = table.findVisit(
        result.ok ? result.data.id : "no visit was created",
      );
      expect(created).toMatchObject({
        patientId: "patient-1",
        providerId: "user-1",
        createdById: "user-1",
        visitType: "CLINIC",
        startDateTime: STARTED,
        deletedAt: null,
      });
      expect(created?.endDateTime ?? null).toBeNull();
    });
  });

  describe("update", () => {
    it("refuses a write with no session", async () => {
      getSession.mockResolvedValue(null);

      await expect(updateVisit("visit-1", input())).resolves.toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.UNAUTHENTICATED },
      });
    });

    it("answers not found for a visit that is missing or archived", async () => {
      const archived = visit({ deletedAt: ARCHIVED });
      seed({ visits: [archived] });

      await expect(updateVisit("visit-1", input())).resolves.toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.NOT_FOUND },
      });
      expect(archived.reason).toBe("Annual check");
    });

    it("answers not found for a visit whose patient is archived", async () => {
      const archivedPatient = { ...PATIENT, deletedAt: ARCHIVED };
      seed({ patients: [archivedPatient] });

      await expect(updateVisit("visit-1", input())).resolves.toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.NOT_FOUND },
      });
    });

    it("edits the visit the path addressed and records who edited it", async () => {
      const result = await updateVisit(
        "visit-1",
        input({ reason: "Follow-up", visitType: "FOLLOWUP" }),
      );

      expect(result).toMatchObject({ ok: true, data: { id: "visit-1" } });
      expect(table.findVisit("visit-1")).toMatchObject({
        reason: "Follow-up",
        visitType: "FOLLOWUP",
        updatedById: "user-1",
      });
    });

    it("cannot move a visit to another patient", async () => {
      const other = { ...PATIENT, id: "patient-3" };
      seed({ patients: [PATIENT, other] });

      await updateVisit("visit-1", input({ patientId: "patient-3" }));

      expect(table.findVisit("visit-1")?.patientId).toBe("patient-1");
    });

    it("refuses to edit a visit that is checked out", async () => {
      seed({ visits: [visit({ endDateTime: CHECKED_OUT })] });

      await expect(
        updateVisit("visit-1", input({ reason: "Too late" })),
      ).resolves.toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.CONFLICT },
      });
      expect(table.findVisit("visit-1")?.reason).toBe("Annual check");
    });
  });

  describe("checkout", () => {
    it("ends the visit at the moment it is checked out", async () => {
      const result = await checkoutVisit("visit-1");

      expect(result).toMatchObject({ ok: true, data: { id: "visit-1" } });
      const checkedOut = table.findVisit("visit-1");
      expect(checkedOut?.endDateTime).toBeInstanceOf(Date);
      expect(checkedOut?.updatedById).toBe("user-1");
    });

    it("refuses to check out a visit twice", async () => {
      seed({ visits: [visit({ endDateTime: CHECKED_OUT })] });

      await expect(checkoutVisit("visit-1")).resolves.toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.CONFLICT },
      });
      expect(table.findVisit("visit-1")?.endDateTime).toEqual(CHECKED_OUT);
    });

    it("refuses a checkout with no session", async () => {
      getSession.mockResolvedValue(null);

      await expect(checkoutVisit("visit-1")).resolves.toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.UNAUTHENTICATED },
      });
    });

    it("answers not found for a visit that is missing", async () => {
      await expect(checkoutVisit("visit-404")).resolves.toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.NOT_FOUND },
      });
    });
  });

  describe("archive", () => {
    it("archives the visit rather than destroying it", async () => {
      const result = await deleteVisit("visit-1");

      expect(result).toMatchObject({ ok: true, data: { id: "visit-1" } });
      expect(table.findVisit("visit-1")?.deletedAt).toBeInstanceOf(Date);
      expect(table.destroyed).toEqual([]);
    });

    it("is idempotent, so a retried archive reports the same result", async () => {
      await deleteVisit("visit-1");
      const first = table.findVisit("visit-1")?.deletedAt;

      const retried = await deleteVisit("visit-1");

      expect(retried).toMatchObject({ ok: true });
      expect(table.findVisit("visit-1")?.deletedAt).toEqual(first);
    });

    it("refuses to archive a visit that is checked out", async () => {
      seed({ visits: [visit({ endDateTime: CHECKED_OUT })] });

      await expect(deleteVisit("visit-1")).resolves.toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.CONFLICT },
      });
      expect(table.findVisit("visit-1")?.deletedAt).toBeNull();
    });

    it("refuses an already archived visit once checkout has closed it", async () => {
      const archived = new Date("2026-02-01T00:00:00.000Z");
      seed({
        visits: [visit({ endDateTime: CHECKED_OUT, deletedAt: archived })],
      });

      await expect(deleteVisit("visit-1")).resolves.toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.CONFLICT },
      });
      expect(table.findVisit("visit-1")?.deletedAt).toEqual(archived);
    });

    it("refuses an archive with no session", async () => {
      getSession.mockResolvedValue(null);

      await expect(deleteVisit("visit-1")).resolves.toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.UNAUTHENTICATED },
      });
    });
  });
});
