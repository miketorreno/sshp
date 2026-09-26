import { beforeEach, describe, expect, it, vi } from "vitest";

const { table, getSession } = await vi.hoisted(async () => {
  const { createVisitTable } = await import(
    "@/server/visits/test-support/visit-table"
  );

  return { table: createVisitTable(), getSession: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ getPrisma: () => table.prisma }));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { FAILURE_CODES } from "@/lib/action-result";
import {
  ARCHIVED_PATIENT,
  CHECKED_OUT,
  SESSION,
  seedVisits,
  visit,
  vitals,
} from "@/server/visits/test-support/seed";
import {
  recordVitals,
  deleteVitals,
  type VitalsInput,
} from "@/server/visits/vitals-commands";

const input = (overrides: Partial<VitalsInput> = {}): VitalsInput => ({
  visitId: "visit-1",
  recordedAt: new Date("2026-03-02T09:40:00.000Z"),
  height: 165,
  weight: 60,
  temperatureCelsius: 36.5,
  systolicBP: 110,
  diastolicBP: 70,
  heartRate: 68,
  respiratoryRate: 14,
  oxygenSaturation: 99,
  glucose: 90,
  cholesterol: 180,
  ...overrides,
});

const seed = (rows?: Parameters<typeof seedVisits>[1]) =>
  seedVisits(table, rows);

/** The row a write reported creating, so a case reads as the fact it checks. */
const findRecorded = (result: Awaited<ReturnType<typeof recordVitals>>) =>
  table.vitals.find((row) => row.id === (result.ok ? result.data.id : null));

describe("vitals commands", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    seed();
  });

  describe("record", () => {
    it("refuses a write with no session", async () => {
      getSession.mockResolvedValue(null);

      await expect(recordVitals(input())).resolves.toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.UNAUTHENTICATED },
      });
    });

    it("answers not found when the visit is missing or its patient is archived", async () => {
      seed({ patients: [ARCHIVED_PATIENT] });

      await expect(recordVitals(input())).resolves.toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.NOT_FOUND },
      });
    });

    it("refuses to add vitals to a visit that is checked out", async () => {
      seed({ visits: [visit({ endDateTime: CHECKED_OUT })] });

      await expect(recordVitals(input())).resolves.toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.CONFLICT },
      });
    });

    it("records the vitals during that visit and who recorded them", async () => {
      const result = await recordVitals(input());

      expect(result).toMatchObject({ ok: true });
      expect(table.vitals).toHaveLength(1);
      const created = findRecorded(result);
      expect(created).toMatchObject({
        visitId: "visit-1",
        recordedById: "user-1",
        height: 165,
        weight: 60,
        temperatureCelsius: 36.5,
        systolicBP: 110,
        diastolicBP: 70,
        heartRate: 68,
        respiratoryRate: 14,
        oxygenSaturation: 99,
        glucose: 90,
        cholesterol: 180,
        deletedAt: null,
      });
    });

    it("preserves numeric zero values", async () => {
      const result = await recordVitals(
        input({ weight: 0, systolicBP: 0, glucose: 0 }),
      );

      expect(result).toMatchObject({ ok: true });
      const created = findRecorded(result);
      expect(created?.weight).toBe(0);
      expect(created?.systolicBP).toBe(0);
      expect(created?.glucose).toBe(0);
    });
  });

  describe("archive", () => {
    it("refuses a write with no session", async () => {
      getSession.mockResolvedValue(null);

      await expect(deleteVitals("visit-1", "vitals-1")).resolves.toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.UNAUTHENTICATED },
      });
    });

    it("answers not found if the visit or vitals do not belong together", async () => {
      seed({ vitals: [vitals({ id: "vitals-2", visitId: "visit-other" })] });

      await expect(deleteVitals("visit-1", "vitals-2")).resolves.toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.NOT_FOUND },
      });
    });

    it("refuses to archive vitals after checkout", async () => {
      seed({
        visits: [visit({ endDateTime: CHECKED_OUT })],
        vitals: [vitals()],
      });

      await expect(deleteVitals("visit-1", "vitals-1")).resolves.toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.CONFLICT },
      });
    });

    it("archives the vitals rather than destroying them", async () => {
      seed({ vitals: [vitals()] });

      const result = await deleteVitals("visit-1", "vitals-1");

      expect(result).toMatchObject({ ok: true, data: { id: "vitals-1" } });
      const v = table.vitals.find((r) => r.id === "vitals-1");
      expect(v?.deletedAt).toBeInstanceOf(Date);
      expect(table.destroyed).toEqual([]);
    });

    it("is idempotent when already archived", async () => {
      const archivedAt = new Date("2026-02-01T00:00:00.000Z");
      seed({ vitals: [vitals({ deletedAt: archivedAt })] });

      const result = await deleteVitals("visit-1", "vitals-1");

      expect(result).toMatchObject({ ok: true, data: { id: "vitals-1" } });
      expect(table.vitals.find((r) => r.id === "vitals-1")?.deletedAt).toEqual(
        archivedAt,
      );
    });

    it("refuses an already archived record once checkout has closed the visit", async () => {
      const archivedAt = new Date("2026-02-01T00:00:00.000Z");
      seed({
        visits: [visit({ endDateTime: CHECKED_OUT })],
        vitals: [vitals({ deletedAt: archivedAt })],
      });

      const result = await deleteVitals("visit-1", "vitals-1");

      expect(result).toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.CONFLICT },
      });
      expect(table.vitals.find((r) => r.id === "vitals-1")?.deletedAt).toEqual(
        archivedAt,
      );
    });
  });
});
