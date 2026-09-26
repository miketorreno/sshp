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
  SESSION,
  hoursFromStartOfToday,
  localDay,
  startOfToday,
  seedVisits,
  visit,
} from "@/server/visits/test-support/seed";
import { getVisitDetail, listVisits } from "@/server/visits/reads";

const seed = (rows?: Parameters<typeof seedVisits>[1]) =>
  seedVisits(table, rows);

const AT = new Date("2026-03-02T09:30:00.000Z");
const ARCHIVED_AT = new Date("2026-02-01T00:00:00.000Z");

/** A record of any kind inside a visit, active and owned by that visit. */
const recorded = (kind: string, id: string) => ({
  id,
  visitId: "visit-1",
  recordedAt: AT,
  orderedAt: AT,
  createdAt: AT,
  diagnosedAt: AT,
  performedAt: AT,
  deletedAt: null,
  ...(kind === "med" ? { medicationId: "medicine-1" } : {}),
});

/** The same record, archived: retained for history, out of normal reads. */
const archived = (kind: string, id: string) => ({
  ...recorded(kind, id),
  deletedAt: ARCHIVED_AT,
});

const detail = (id: string) => getVisitDetail(id);

describe("visit reads", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    seed();
  });

  it("requires a session to read the list", async () => {
    getSession.mockResolvedValue(null);

    await expect(listVisits()).rejects.toMatchObject({
      name: "UnauthenticatedError",
      failure: { code: FAILURE_CODES.UNAUTHENTICATED },
    });
  });

  it("requires a session to read a detail", async () => {
    getSession.mockResolvedValue(null);

    await expect(detail("visit-1")).rejects.toMatchObject({
      name: "UnauthenticatedError",
      failure: { code: FAILURE_CODES.UNAUTHENTICATED },
    });
  });

  describe("list", () => {
    it("answers with the patient and provider data Today's Outpatients renders", async () => {
      const [read] = await listVisits();

      expect(read).toEqual({
        id: "visit-1",
        patientId: "patient-1",
        providerId: "user-1",
        visitType: "CLINIC",
        startDateTime: "2026-03-02T09:00:00.000Z",
        endDateTime: null,
        reason: "Annual check",
        patient: {
          id: "patient-1",
          patientCode: "PAT-001",
          firstName: "Ada",
          middleName: "Quincy",
          lastName: "Lovelace",
          dateOfBirth: "1815-12-10T00:00:00.000Z",
          gender: "Female",
        },
        provider: { id: "user-1", name: "Dr Iris", role: "DOCTOR" },
        createdAt: "2026-01-02T03:04:05.000Z",
      });
    });

    it("reads the visits that started on the days the window covers", async () => {
      seed({
        visits: [
          visit({ id: "visit-today", startDateTime: hoursFromStartOfToday(1) }),
          visit({
            id: "visit-yesterday",
            startDateTime: hoursFromStartOfToday(-3),
          }),
        ],
      });

      const today = localDay(new Date());
      const yesterday = localDay(
        new Date(startOfToday().getTime() - 3 * 3_600_000),
      );

      await expect(
        listVisits({ from: today, to: today }).then((reads) =>
          reads.map((read) => read.id),
        ),
      ).resolves.toEqual(["visit-today"]);

      await expect(
        listVisits({ from: yesterday, to: yesterday }).then((reads) =>
          reads.map((read) => read.id),
        ),
      ).resolves.toEqual(["visit-yesterday"]);
    });

    it("keeps a visit that checked in late and checked out the next morning", async () => {
      seed({
        visits: [
          visit({
            id: "visit-overnight",
            startDateTime: hoursFromStartOfToday(-3),
            endDateTime: hoursFromStartOfToday(1),
          }),
        ],
      });

      const today = localDay(new Date());

      await expect(
        listVisits({ from: today, to: today }).then((reads) =>
          reads.map((read) => read.id),
        ),
      ).resolves.toEqual([]);

      const yesterday = localDay(
        new Date(startOfToday().getTime() - 3 * 3_600_000),
      );

      await expect(
        listVisits({ from: yesterday, to: yesterday }).then((reads) =>
          reads.map((read) => read.id),
        ),
      ).resolves.toEqual(["visit-overnight"]);
    });

    it("reads only the visit type the caller asked for", async () => {
      seed({
        visits: [
          visit({ id: "visit-clinic" }),
          visit({ id: "visit-lab", visitType: "LAB" }),
        ],
      });

      await expect(
        listVisits({ visitType: "LAB" }).then((reads) =>
          reads.map((read) => read.id),
        ),
      ).resolves.toEqual(["visit-lab"]);
    });

    it("hides archived visits and visits whose patient is archived", async () => {
      seed({
        visits: [
          visit({ id: "visit-active" }),
          visit({
            id: "visit-archived",
            deletedAt: new Date("2026-02-01T00:00:00.000Z"),
          }),
          visit({ id: "visit-archived-patient", patientId: "patient-2" }),
        ],
      });

      await expect(
        listVisits().then((reads) => reads.map((read) => read.id)),
      ).resolves.toEqual(["visit-active"]);
    });

    it("starts from the beginning of the window", async () => {
      seed({
        visits: [
          visit({
            id: "visit-early",
            startDateTime: new Date("2026-03-02T07:00:00.000Z"),
          }),
          visit({
            id: "visit-late",
            startDateTime: new Date("2026-03-02T11:00:00.000Z"),
          }),
        ],
      });

      await expect(
        listVisits().then((reads) => reads.map((read) => read.id)),
      ).resolves.toEqual(["visit-early", "visit-late"]);
    });
  });

  describe("detail", () => {
    it("answers with the visit and the clinical records recorded during it", async () => {
      seed({
        vitals: [
          {
            id: "vitals-1",
            visitId: "visit-1",
            recordedById: "user-1",
            recordedAt: new Date("2026-03-02T09:30:00.000Z"),
            height: 170,
            weight: 60,
            systolicBP: 120,
            diastolicBP: 80,
            heartRate: 72,
            temperatureCelsius: 36.8,
            respiratoryRate: 16,
            oxygenSaturation: 98,
            glucose: 90,
            cholesterol: 180,
            deletedAt: null,
          },
        ],
        labOrders: [
          {
            id: "lab-order-1",
            visitId: "visit-1",
            orderedById: "user-1",
            orderedAt: new Date("2026-03-02T09:35:00.000Z"),
            completedAt: null,
            orderStatus: "REQUESTED",
            labType: "Complete Blood Count",
            notes: "fasting",
            result: null,
            deletedAt: null,
          },
        ],
        medOrders: [
          {
            id: "med-order-1",
            visitId: "visit-1",
            orderedById: null,
            medicationId: "medication-1",
            orderedAt: new Date("2026-03-02T09:40:00.000Z"),
            completedAt: null,
            orderStatus: "REQUESTED",
            dosage: "500mg",
            frequency: "Twice a day",
            route: "Oral",
            notes: null,
            deletedAt: null,
          },
        ],
      });
      table.medications.splice(0, table.medications.length, {
        id: "medication-1",
        name: "Amoxicillin",
        deletedAt: null,
      });

      await expect(detail("visit-1")).resolves.toMatchObject({
        id: "visit-1",
        updatedAt: "2026-01-02T03:04:05.000Z",
        vitals: [
          {
            id: "vitals-1",
            recordedAt: "2026-03-02T09:30:00.000Z",
            heartRate: 72,
            recordedBy: { id: "user-1", name: "Dr Iris", role: "DOCTOR" },
          },
        ],
        labOrders: [
          {
            id: "lab-order-1",
            orderedAt: "2026-03-02T09:35:00.000Z",
            orderStatus: "REQUESTED",
            labType: "Complete Blood Count",
            orderedBy: { id: "user-1", name: "Dr Iris" },
          },
        ],
        imagingOrders: [],
        medOrders: [
          {
            id: "med-order-1",
            medication: "Amoxicillin",
            dosage: "500mg",
            orderedBy: null,
          },
        ],
        clinicalNotes: [],
        diagnoses: [],
        procedures: [],
      });
    });

    it("leaves archived records out of the visit", async () => {
      seed({
        vitals: [
          {
            id: "vitals-active",
            visitId: "visit-1",
            recordedAt: new Date("2026-03-02T09:30:00.000Z"),
            deletedAt: null,
          },
          {
            id: "vitals-archived",
            visitId: "visit-1",
            recordedAt: new Date("2026-03-02T09:45:00.000Z"),
            deletedAt: new Date("2026-02-01T00:00:00.000Z"),
          },
        ],
        labOrders: [
          recorded("lab", "lab-active"),
          archived("lab", "lab-archived"),
        ],
        imagingOrders: [
          recorded("imaging", "imaging-active"),
          archived("imaging", "imaging-archived"),
        ],
        medOrders: [
          recorded("med", "med-active"),
          archived("med", "med-archived"),
        ],
        clinicalNotes: [
          recorded("note", "note-active"),
          archived("note", "note-archived"),
        ],
        diagnoses: [
          recorded("diagnosis", "diagnosis-active"),
          archived("diagnosis", "diagnosis-archived"),
        ],
        procedures: [
          recorded("procedure", "procedure-active"),
          archived("procedure", "procedure-archived"),
        ],
      });

      const read = await detail("visit-1");

      // Every record kind inside a visit is filtered the same way, so archiving
      // any of them leaves it out of the visit it was recorded during.
      expect(read?.vitals.map((row) => row.id)).toEqual(["vitals-active"]);
      expect(read?.labOrders.map((row) => row.id)).toEqual(["lab-active"]);
      expect(read?.imagingOrders.map((row) => row.id)).toEqual([
        "imaging-active",
      ]);
      expect(read?.medOrders.map((row) => row.id)).toEqual(["med-active"]);
      expect(read?.clinicalNotes.map((row) => row.id)).toEqual(["note-active"]);
      expect(read?.diagnoses.map((row) => row.id)).toEqual([
        "diagnosis-active",
      ]);
      expect(read?.procedures.map((row) => row.id)).toEqual([
        "procedure-active",
      ]);
    });

    it("returns nothing for a missing, archived or inactive visit", async () => {
      await expect(detail("visit-404")).resolves.toBeNull();

      seed({
        visits: [
          visit({
            id: "visit-archived",
            deletedAt: new Date("2026-02-01T00:00:00.000Z"),
          }),
        ],
      });
      await expect(detail("visit-archived")).resolves.toBeNull();

      seed({ visits: [visit({ patientId: "patient-2" })] });
      await expect(detail("visit-1")).resolves.toBeNull();
    });
  });
});
