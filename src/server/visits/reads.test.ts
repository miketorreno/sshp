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
import { withClinicTimeZone } from "@/lib/test-support/clinic-time";
import {
  PATIENT,
  SESSION,
  hoursFromStartOfToday,
  clinicToday,
  clinicYesterday,
  imagingOrder,
  labOrder,
  medOrder,
  seedVisits,
  visit,
  vitals,
} from "@/server/visits/test-support/seed";
import {
  getVisitDetail,
  listArchivedOrders,
  listArchivedVitals,
  listArchivedVisits,
  listVisits,
} from "@/server/visits/reads";

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

      const today = clinicToday();
      const yesterday = clinicYesterday();

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

    it("resolves a day window in the clinic's zone, not the server's", async () => {
      // 01:30 on the third of March in Manila, but still the second of March in
      // UTC. Which day a visit counts on is the clinic's question to answer.
      seed({
        visits: [visit({ startDateTime: new Date("2026-03-02T17:30:00.000Z") })],
      });

      const day = "2026-03-03";

      await expect(
        withClinicTimeZone("Asia/Manila", () =>
          listVisits({ from: day, to: day }).then((reads) =>
            reads.map((read) => read.id),
          ),
        ),
      ).resolves.toEqual(["visit-1"]);

      await expect(
        withClinicTimeZone("UTC", () =>
          listVisits({ from: day, to: day }).then((reads) =>
            reads.map((read) => read.id),
          ),
        ),
      ).resolves.toEqual([]);
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

      const today = clinicToday();

      await expect(
        listVisits({ from: today, to: today }).then((reads) =>
          reads.map((read) => read.id),
        ),
      ).resolves.toEqual([]);

      const yesterday = clinicYesterday();

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
  describe("archive", () => {
    /** An archived visit of the active patient, and one of the archived patient. */
    const archivedVisits = () => [
      visit({
        id: "visit-archived",
        startDateTime: new Date("2026-03-03T09:00:00.000Z"),
        deletedAt: new Date("2026-04-01T08:00:00.000Z"),
      }),
      visit({
        id: "visit-under-archived-patient",
        patientId: "patient-2",
        startDateTime: new Date("2026-03-04T09:00:00.000Z"),
        deletedAt: new Date("2026-04-02T08:00:00.000Z"),
      }),
    ];

    const asUser = () =>
      getSession.mockResolvedValue({
        ...SESSION,
        user: { ...SESSION.user, role: "USER" },
      });

    describe("visits", () => {
      it("refuses a session that cannot archive", async () => {
        asUser();

        await expect(listArchivedVisits()).rejects.toMatchObject({
          name: "ForbiddenError",
          failure: { code: FAILURE_CODES.FORBIDDEN },
        });
      });

      it("returns the archived visits, most recently archived first", async () => {
        seed({ visits: archivedVisits() });

        await expect(listArchivedVisits()).resolves.toEqual({
          rows: [
            expect.objectContaining({
              id: "visit-under-archived-patient",
              visitType: "CLINIC",
              startDateTime: "2026-03-04T09:00:00.000Z",
              endDateTime: null,
              reason: "Annual check",
              patient: {
                id: "patient-2",
                name: `${PATIENT.firstName} ${PATIENT.middleName} ${PATIENT.lastName}`,
              },
              archivedAt: "2026-04-02T08:00:00.000Z",
            }),
            expect.objectContaining({
              id: "visit-archived",
              archivedAt: "2026-04-01T08:00:00.000Z",
            }),
          ],
          page: 1,
          pageSize: 20,
          totalCount: 2,
        });
      });

      it("names the patient to restore first when the patient is archived too", async () => {
        // The command refuses this restore, and so does any read of the visit, so
        // the archive unwinds from the patient down rather than from the visit up.
        seed({ visits: archivedVisits() });

        const { rows } = await listArchivedVisits();

        expect(rows[0].restoreBlockedBy).toEqual({
          recordType: "Patient",
          id: "patient-2",
          patientName: `${PATIENT.firstName} ${PATIENT.middleName} ${PATIENT.lastName}`,
        });
        expect(rows[1].restoreBlockedBy).toBeNull();
      });

      it("never offers a visit that is still open", async () => {
        seed({ visits: [...archivedVisits(), visit()] });

        const { rows } = await listArchivedVisits();

        expect(rows.map((row) => row.id)).not.toContain("visit-1");
      });

      it("pages the archived visits and counts every one of them", async () => {
        seed({ visits: archivedVisits() });

        await expect(
          listArchivedVisits({ limit: 1, page: 2 }),
        ).resolves.toMatchObject({
          rows: [expect.objectContaining({ id: "visit-archived" })],
          page: 2,
          pageSize: 1,
          totalCount: 2,
        });
      });
    });

    describe("vitals", () => {
      it("refuses a session that cannot archive", async () => {
        asUser();

        await expect(listArchivedVitals()).rejects.toMatchObject({
          name: "ForbiddenError",
          failure: { code: FAILURE_CODES.FORBIDDEN },
        });
      });

      it("returns the archived readings with the patient and visit they belong to", async () => {
        seed({
          visits: archivedVisits(),
          vitals: [
            vitals({
              id: "vitals-archived",
              visitId: "visit-archived",
              deletedAt: ARCHIVED_AT,
            }),
            vitals({
              id: "vitals-in-archived-visit",
              visitId: "visit-under-archived-patient",
              deletedAt: ARCHIVED_AT,
            }),
          ],
        });

        await expect(listArchivedVitals()).resolves.toMatchObject({
          rows: [
            {
              id: "vitals-in-archived-visit",
              visitId: "visit-under-archived-patient",
              recordedAt: "2026-03-02T09:30:00.000Z",
              height: 165,
              weight: 60,
              systolicBP: 120,
              diastolicBP: 80,
              heartRate: 72,
              patient: { id: "patient-2", name: "Ada Quincy Lovelace" },
              archivedAt: ARCHIVED_AT.toISOString(),
              restoreBlockedBy: {
                recordType: "Patient",
                id: "patient-2",
                patientName: "Ada Quincy Lovelace",
              },
            },
            expect.objectContaining({
              id: "vitals-archived",
              visitId: "visit-archived",
              // The reading is restorable only once its visit is back, whatever the
              // patient: the visit is what the reading was recorded during.
              restoreBlockedBy: {
                recordType: "Visit",
                id: "visit-archived",
                patientName: "Ada Quincy Lovelace",
              },
            }),
          ],
          totalCount: 2,
        });
      });

      it("names the visit to restore first when the visit is archived", async () => {
        // The visit is what has to come back before the reading does: a reading is
        // recorded during a visit, and restoring it into an archived one would
        // leave it unreadable.
        seed({
          visits: archivedVisits(),
          vitals: [
            vitals({
              id: "vitals-archived",
              visitId: "visit-archived",
              deletedAt: ARCHIVED_AT,
            }),
          ],
        });

        const { rows } = await listArchivedVitals();

        expect(rows[0].restoreBlockedBy).toEqual({
          recordType: "Visit",
          id: "visit-archived",
          patientName: "Ada Quincy Lovelace",
        });
      });

      it("never offers a reading that is still on the visit", async () => {
        seed({
          visits: archivedVisits(),
          vitals: [
            vitals({ visitId: "visit-archived" }),
            vitals({
              id: "vitals-archived",
              visitId: "visit-archived",
              deletedAt: ARCHIVED_AT,
            }),
          ],
        });

        const { rows } = await listArchivedVitals();

        expect(rows.map((row) => row.id)).toEqual(["vitals-archived"]);
      });
    });

    describe("orders", () => {
      const archivedOrderSeeds = () => ({
        visits: archivedVisits(),
        labOrders: [
          labOrder({ id: "lab-archived", visitId: "visit-archived", deletedAt: ARCHIVED_AT }),
          labOrder({ id: "lab-active" }),
        ],
        imagingOrders: [
          imagingOrder({
            id: "imaging-archived",
            visitId: "visit-under-archived-patient",
            deletedAt: ARCHIVED_AT,
          }),
        ],
        medOrders: [
          medOrder({
            id: "med-archived",
            visitId: "visit-archived",
            deletedAt: new Date("2026-04-03T08:00:00.000Z"),
          }),
          medOrder({ id: "med-active" }),
        ],
        medications: [{ id: "medication-1", name: "Amoxicillin" }],
      });

      it("refuses a session that cannot archive", async () => {
        asUser();

        await expect(listArchivedOrders()).rejects.toMatchObject({
          name: "ForbiddenError",
          failure: { code: FAILURE_CODES.FORBIDDEN },
        });
      });

      it("lists the three kinds of order as one list, most recent archive first", async () => {
        seed(archivedOrderSeeds());

        // One list rather than three, because the three tables are one thing to a
        // reader: the orders that were archived.
        await expect(listArchivedOrders()).resolves.toEqual({
          rows: [
            {
              kind: "MEDICATION",
              id: "med-archived",
              visitId: "visit-archived",
              orderedAt: "2026-03-02T09:37:00.000Z",
              orderStatus: "REQUESTED",
              orderName: "Amoxicillin",
              instructions: "500mg, Twice a day, Oral",
              patient: { id: "patient-1", name: "Ada Quincy Lovelace" },
              archivedAt: "2026-04-03T08:00:00.000Z",
              restoreBlockedBy: {
                recordType: "Visit",
                id: "visit-archived",
                patientName: "Ada Quincy Lovelace",
              },
            },
            expect.objectContaining({
              kind: "LAB",
              id: "lab-archived",
              orderName: "Complete Blood Count",
              instructions: null,
            }),
            expect.objectContaining({
              kind: "IMAGING",
              id: "imaging-archived",
              orderName: "Chest X-Ray (2 views)",
              instructions: null,
              restoreBlockedBy: {
                recordType: "Patient",
                id: "patient-2",
                patientName: "Ada Quincy Lovelace",
              },
            }),
          ],
          page: 1,
          pageSize: 20,
          totalCount: 3,
        });
      });

      it("pages across the three tables rather than through one of them", async () => {
        seed(archivedOrderSeeds());

        // The second page has to be the second page of the merged list. Reading each
        // table's own page instead would repeat and drop orders depending on which
        // table they happened to land in.
        const first = await listArchivedOrders({ limit: 2 });
        const second = await listArchivedOrders({ limit: 2, page: 2 });

        expect(first.rows.map((row) => row.id)).toEqual([
          "med-archived",
          "lab-archived",
        ]);
        expect(second.rows.map((row) => row.id)).toEqual(["imaging-archived"]);
        expect(second.totalCount).toBe(3);
      });

      it("never offers an order that is still open", async () => {
        seed(archivedOrderSeeds());

        const { rows } = await listArchivedOrders();

        expect(rows.map((row) => row.id)).not.toContain("lab-active");
        expect(rows.map((row) => row.id)).not.toContain("med-active");
      });
    });
  });
});
