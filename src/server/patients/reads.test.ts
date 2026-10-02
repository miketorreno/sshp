import { beforeEach, describe, expect, it, vi } from "vitest";

const { table, getSession } = await vi.hoisted(async () => {
  const { createPatientTable } = await import(
    "@/server/patients/test-support/patient-table"
  );

  return { table: createPatientTable(), getSession: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ getPrisma: () => table.prisma }));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { UnauthenticatedError } from "@/lib/session";
import { MAX_LIST_LIMIT } from "@/server/patients/contract";
import {
  getPatientDetail,
  listAdmittedPatients,
  listPatientHistory,
  listPatients,
} from "@/server/patients/reads";

const SESSION = {
  session: { id: "session-1", userId: "user-1" },
  user: {
    id: "user-1",
    email: "doctor@clinic.test",
    role: "DOCTOR",
    isActive: true,
  },
};

const ada = {
  id: "patient-1",
  patientCode: "PAT-001",
  firstName: "Ada",
  middleName: "Quincy",
  lastName: "Lovelace",
  dateOfBirth: new Date("1815-12-10T00:00:00.000Z"),
  gender: "Female",
  bloodGroup: "O+",
  placeOfBirth: "London",
  occupation: "Mathematician",
  phone: "555-0100",
  email: "ada@clinic.test",
  address: "12 Analytical Way",
  country: "UK",
  guardian: null,
  referredBy: null,
  referredDate: null,
  patientType: "OUTPATIENT",
  createdAt: new Date("2026-01-02T03:04:05.000Z"),
  updatedAt: new Date("2026-01-02T03:04:05.000Z"),
  deletedAt: null,
};

const grace = {
  ...ada,
  id: "patient-2",
  patientCode: "PAT-002",
  firstName: "Grace",
  lastName: "Hopper",
  email: "grace@clinic.test",
  patientType: "INPATIENT",
  createdAt: new Date("2026-01-01T03:04:05.000Z"),
};

const alan = {
  ...ada,
  id: "patient-3",
  patientCode: "PAT-003",
  firstName: "Alan",
  lastName: "Turing",
  email: "alan@clinic.test",
  deletedAt: new Date("2026-02-01T00:00:00.000Z"),
  createdAt: new Date("2025-12-31T03:04:05.000Z"),
};

const seed = () => {
  table.rows.splice(0, table.rows.length, ada, grace, alan);
  table.events.splice(0, table.events.length);
};

describe("patient reads", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    seed();
  });

  it("requires a session", async () => {
    getSession.mockResolvedValue(null);

    await expect(listPatients()).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(listAdmittedPatients()).rejects.toBeInstanceOf(
      UnauthenticatedError
    );
    await expect(getPatientDetail("patient-1")).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    await expect(listPatientHistory("patient-1")).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });

  describe("list", () => {
    it("returns browser-facing summaries newest first, without archived patients", async () => {
      const page = await listPatients();

      expect(page.rows).toEqual([
        expect.objectContaining({
          id: "patient-1",
          patientCode: "PAT-001",
          firstName: "Ada",
          middleName: "Quincy",
          lastName: "Lovelace",
          dateOfBirth: "1815-12-10T00:00:00.000Z",
          email: "ada@clinic.test",
          gender: "Female",
          bloodGroup: "O+",
          phone: "555-0100",
          patientType: "OUTPATIENT",
          createdAt: "2026-01-02T03:04:05.000Z",
        }),
        expect.objectContaining({ id: "patient-2" }),
      ]);
    });

    it("reports the page it served and how many patients matched in total", async () => {
      await expect(listPatients({ page: 2, limit: 1 })).resolves.toEqual({
        rows: [expect.objectContaining({ id: "patient-2" })],
        page: 2,
        pageSize: 1,
        totalCount: 2,
      });
    });

    it("counts every matching patient, not just the page it returned", async () => {
      const page = await listPatients({ limit: 1 });

      expect(page.rows).toHaveLength(1);
      expect(page.totalCount).toBe(2);
    });

    it("carries no database bookkeeping into the browser", async () => {
      const { rows } = await listPatients();

      expect(rows[0]).not.toHaveProperty("deletedAt");
      expect(rows[0]).not.toHaveProperty("updatedAt");
    });

    it("clamps paging to bounds a client cannot escape", async () => {
      const page = await listPatients({ page: 0, limit: 5000 });

      expect(page.rows).toHaveLength(2);
      expect(page.page).toBe(1);
      expect(page.pageSize).toBe(MAX_LIST_LIMIT);
    });
  });

  describe("search", () => {
    it("matches a name, an email or a patient code, ignoring case", async () => {
      const byName = await listPatients({ search: "LOVELACE" });
      const byEmail = await listPatients({ search: "grace@clinic" });
      const byCode = await listPatients({ search: "pat-002" });

      expect(byName.rows.map((patient) => patient.id)).toEqual(["patient-1"]);
      expect(byEmail.rows.map((patient) => patient.id)).toEqual(["patient-2"]);
      expect(byCode.rows.map((patient) => patient.id)).toEqual(["patient-2"]);
    });

    it("counts the matches, so a page reports how many there are", async () => {
      const page = await listPatients({ search: "clinic.test" });

      expect(page.totalCount).toBe(2);
    });

    it("never offers an archived patient, nor counts one", async () => {
      const page = await listPatients({ search: "alan" });

      expect(page.rows).toEqual([]);
      expect(page.totalCount).toBe(0);
    });

    it("treats an untouched search box as no search rather than as no matches", async () => {
      const page = await listPatients({ search: "   " });

      expect(page.totalCount).toBe(2);
    });

    it("pages through the matches rather than stopping at a fixed ceiling", async () => {
      const first = await listPatients({ search: "clinic.test", limit: 1 });
      const second = await listPatients({
        search: "clinic.test",
        limit: 1,
        page: 2,
      });

      expect(first.rows.map((patient) => patient.id)).toEqual(["patient-1"]);
      expect(second.rows.map((patient) => patient.id)).toEqual(["patient-2"]);
      expect(second.totalCount).toBe(2);
    });
  });

  describe("admitted", () => {
    it("returns admitted patients rather than fabricated visit rows", async () => {
      await expect(listAdmittedPatients()).resolves.toEqual([
        expect.objectContaining({
          id: "patient-2",
          firstName: "Grace",
          lastName: "Hopper",
          patientType: "INPATIENT",
        }),
      ]);
    });
  });

  describe("detail", () => {
    it("returns the detail read model for an active patient", async () => {
      await expect(getPatientDetail("patient-1")).resolves.toEqual({
        id: "patient-1",
        patientCode: "PAT-001",
        firstName: "Ada",
        middleName: "Quincy",
        lastName: "Lovelace",
        dateOfBirth: "1815-12-10T00:00:00.000Z",
        gender: "Female",
        bloodGroup: "O+",
        phone: "555-0100",
        email: "ada@clinic.test",
        patientType: "OUTPATIENT",
        createdAt: "2026-01-02T03:04:05.000Z",
        placeOfBirth: "London",
        occupation: "Mathematician",
        address: "12 Analytical Way",
        country: "UK",
        guardian: null,
        referredBy: null,
        referredDate: null,
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
    });

    it("reports a missing or archived patient as not found", async () => {
      await expect(getPatientDetail("patient-404")).resolves.toBeNull();
      await expect(getPatientDetail(alan.id)).resolves.toBeNull();
    });
  });

  describe("history", () => {
    it("returns the archive and restore events in the order they happened", async () => {
      // Seeded newest-first on purpose: the read has to reorder them, not pass
      // the order the log happens to be stored in through.
      table.events.push(
        {
          id: "archive-event-2",
          action: "RESTORE",
          recordType: "Patient",
          recordId: "patient-1",
          actorId: "user-2",
          occurredAt: new Date("2026-03-02T00:00:00.000Z"),
        },
        {
          id: "archive-event-1",
          action: "ARCHIVE",
          recordType: "Patient",
          recordId: "patient-1",
          actorId: "user-1",
          occurredAt: new Date("2026-02-01T00:00:00.000Z"),
        },
        {
          id: "archive-event-3",
          action: "ARCHIVE",
          recordType: "Appointment",
          recordId: "appointment-9",
          actorId: "user-3",
          occurredAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      );

      await expect(listPatientHistory("patient-1")).resolves.toEqual([
        {
          id: "archive-event-1",
          action: "ARCHIVE",
          recordType: "Patient",
          recordId: "patient-1",
          actorId: "user-1",
          occurredAt: "2026-02-01T00:00:00.000Z",
        },
        {
          id: "archive-event-2",
          action: "RESTORE",
          recordType: "Patient",
          recordId: "patient-1",
          actorId: "user-2",
          occurredAt: "2026-03-02T00:00:00.000Z",
        },
      ]);
    });

    it("answers an empty history for a patient that was never archived", async () => {
      await expect(listPatientHistory("patient-404")).resolves.toEqual([]);
    });

    it("keeps two events in the same millisecond in the order they were written", async () => {
      // `occurredAt` ties here, which is what the id tie-break exists for. Pinned
      // because an archive and its restore can genuinely land in one millisecond,
      // and a history that swapped them would read as a restore before the
      // archive it undid.
      const sameInstant = new Date("2026-03-02T09:00:00.000Z");

      table.events.push(
        {
          id: "archive-event-2",
          action: "RESTORE",
          recordType: "Patient",
          recordId: "patient-1",
          actorId: "user-1",
          occurredAt: sameInstant,
        },
        {
          id: "archive-event-1",
          action: "ARCHIVE",
          recordType: "Patient",
          recordId: "patient-1",
          actorId: "user-1",
          occurredAt: sameInstant,
        },
      );

      await expect(listPatientHistory("patient-1")).resolves.toMatchObject([
        { id: "archive-event-1", action: "ARCHIVE" },
        { id: "archive-event-2", action: "RESTORE" },
      ]);
    });
  });
});
