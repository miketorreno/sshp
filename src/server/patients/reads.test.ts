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
import {
  getPatientDetail,
  listAdmittedPatients,
  listPatients,
  searchPatients,
} from "@/server/patients/reads";

const SESSION = {
  session: { id: "session-1", userId: "user-1" },
  user: { id: "user-1", email: "doctor@clinic.test" },
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
};

describe("patient reads", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    seed();
  });

  it("requires a session", async () => {
    getSession.mockResolvedValue(null);

    await expect(listPatients()).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(searchPatients("ada")).rejects.toBeInstanceOf(
      UnauthenticatedError
    );
    await expect(listAdmittedPatients()).rejects.toBeInstanceOf(
      UnauthenticatedError
    );
    await expect(getPatientDetail("patient-1")).rejects.toBeInstanceOf(
      UnauthenticatedError
    );
  });

  describe("list", () => {
    it("returns browser-facing summaries newest first, without archived patients", async () => {
      await expect(listPatients()).resolves.toEqual([
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

    it("carries no database bookkeeping into the browser", async () => {
      const [summary] = await listPatients();

      expect(summary).not.toHaveProperty("deletedAt");
      expect(summary).not.toHaveProperty("updatedAt");
    });

    it("serves one page at a time", async () => {
      const first = await listPatients({ limit: 1 });
      const second = await listPatients({ page: 2, limit: 1 });

      expect(first.map((patient) => patient.id)).toEqual(["patient-1"]);
      expect(second.map((patient) => patient.id)).toEqual(["patient-2"]);
    });

    it("clamps paging to bounds a client cannot escape", async () => {
      await expect(listPatients({ page: 0, limit: 5000 })).resolves.toHaveLength(
        2
      );
    });
  });

  describe("search", () => {
    it("returns nothing for an empty query", async () => {
      await expect(searchPatients("   ")).resolves.toEqual([]);
    });

    it("matches a name, an email or a patient code, ignoring case", async () => {
      const byName = await searchPatients("LOVELACE");
      const byEmail = await searchPatients("grace@clinic");
      const byCode = await searchPatients("pat-002");

      expect(byName.map((patient) => patient.id)).toEqual(["patient-1"]);
      expect(byEmail.map((patient) => patient.id)).toEqual(["patient-2"]);
      expect(byCode.map((patient) => patient.id)).toEqual(["patient-2"]);
    });

    it("never offers an archived patient", async () => {
      await expect(searchPatients("alan")).resolves.toEqual([]);
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
});
