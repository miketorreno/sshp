import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { table, getSession } = await vi.hoisted(async () => {
  // The report route reads patients *and* the visits that make a patient active,
  // so these routes are tested against the two-table fixture rather than the
  // patient-only one.
  const { createReportTable } = await import(
    "@/server/patients/test-support/report-table"
  );

  return { table: createReportTable(), getSession: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ getPrisma: () => table.prisma }));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { GET as admittedGET } from "@/app/api/patients/admitted/route";
import { GET as detailGET } from "@/app/api/patients/[id]/route";
import * as patientRoute from "@/app/api/patients/route";
import * as patientReportRoute from "@/app/api/patients/reports/route";
import { FAILURE_CODES, FAILURE_MESSAGES } from "@/lib/action-result";

const PATIENT = {
  id: "patient-1",
  patientCode: "PAT-001",
  firstName: "Ada",
  middleName: "Q",
  lastName: "Lovelace",
  dateOfBirth: new Date("1815-12-10T00:00:00.000Z"),
  gender: "Female",
  bloodGroup: "O+",
  placeOfBirth: "London",
  occupation: null,
  phone: "555-0100",
  email: "ada@clinic.test",
  address: null,
  country: null,
  guardian: null,
  referredBy: null,
  referredDate: null,
  patientType: "OUTPATIENT",
  createdAt: new Date("2026-01-02T03:04:05.000Z"),
  updatedAt: new Date("2026-01-02T03:04:05.000Z"),
  deletedAt: null,
};

const SESSION = {
  session: { id: "session-1", userId: "user-1" },
  user: {
    id: "user-1",
    email: "doctor@clinic.test",
    role: "DOCTOR",
    isActive: true,
  },
};

const listRequest = (query = "") =>
  new NextRequest(`http://localhost/api/patients${query}`);

const detailRequest = (id: string) =>
  detailGET(new NextRequest(`http://localhost/api/patients/${id}`), {
    params: Promise.resolve({ id }),
  });

const reportRequest = (query = "") =>
  new NextRequest(`http://localhost/api/patients/reports${query}`);

const UNAUTHENTICATED_BODY = {
  error: {
    code: FAILURE_CODES.UNAUTHENTICATED,
    message: FAILURE_MESSAGES.UNAUTHENTICATED,
  },
};

const FORBIDDEN_BODY = {
  error: {
    code: FAILURE_CODES.FORBIDDEN,
    message: FAILURE_MESSAGES.FORBIDDEN,
  },
};

/** The same clinician, holding a different role. */
const sessionFor = (role: string) => ({
  ...SESSION,
  user: { ...SESSION.user, role },
});

describe("patient read routes", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    table.patients.splice(
      0,
      table.patients.length,
      PATIENT,
      {
        ...PATIENT,
        id: "patient-2",
        firstName: "Grace",
        lastName: "Hopper",
        email: "grace@clinic.test",
        patientType: "INPATIENT",
        createdAt: new Date("2026-01-01T03:04:05.000Z"),
      }
    );
  });

  it("serves reads only, with no duplicate write methods", () => {
    expect(Object.keys(patientRoute)).toEqual(["GET"]);
  });

  describe("list and search", () => {
    it("answers a paged list read with summary DTOs and a total", async () => {
      const response = await patientRoute.GET(listRequest("?page=1&limit=1"));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        rows: [
          expect.objectContaining({
            id: "patient-1",
            dateOfBirth: "1815-12-10T00:00:00.000Z",
            createdAt: "2026-01-02T03:04:05.000Z",
          }),
        ],
        page: 1,
        pageSize: 1,
        totalCount: 2,
      });
    });

    it("serves search from the same route", async () => {
      const response = await patientRoute.GET(listRequest("?search=ada"));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(
        expect.objectContaining({
          rows: [expect.objectContaining({ id: "patient-1" })],
          totalCount: 1,
        })
      );
    });

    it("rejects an unauthenticated read with the stable failure contract", async () => {
      getSession.mockResolvedValue(null);

      const response = await patientRoute.GET(listRequest());

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual(UNAUTHENTICATED_BODY);
    });
  });

  describe("detail", () => {
    it("answers with the detail DTO", async () => {
      const response = await detailRequest("patient-1");

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(
        expect.objectContaining({
          id: "patient-1",
          placeOfBirth: "London",
          updatedAt: "2026-01-02T03:04:05.000Z",
        })
      );
    });

    it("answers not found for a missing or archived patient", async () => {
      const response = await detailRequest("patient-404");

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: { code: FAILURE_CODES.NOT_FOUND, message: "Patient not found" },
      });
    });

    it("rejects an unauthenticated read with the stable failure contract", async () => {
      getSession.mockResolvedValue(null);

      const response = await detailRequest("patient-1");

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual(UNAUTHENTICATED_BODY);
    });
  });

  describe("report", () => {
    it("serves reads only, with no duplicate write methods", () => {
      expect(Object.keys(patientReportRoute)).toEqual(["GET"]);
    });

    it("answers with the report for the period asked for", async () => {
      const response = await patientReportRoute.GET(reportRequest("?period=week"));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(
        expect.objectContaining({
          period: expect.objectContaining({ kind: "week" }),
          panels: expect.objectContaining({
            totalPatients: expect.objectContaining({ current: expect.any(Number) }),
          }),
          ageGroups: expect.any(Array),
          patientTypes: expect.any(Array),
        }),
      );
    });

    it("reads an unnamed period as a month rather than as an empty report", async () => {
      const response = await patientReportRoute.GET(reportRequest());

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(
        expect.objectContaining({ period: expect.objectContaining({ kind: "month" }) }),
      );
    });

    it("reads a period the schema does not name as a month", async () => {
      // A caller naming a period it invented gets the default rather than a
      // report over a window of no length.
      const response = await patientReportRoute.GET(
        reportRequest("?period=fortnight"),
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(
        expect.objectContaining({ period: expect.objectContaining({ kind: "month" }) }),
      );
    });

    it("rejects an unauthenticated read with the stable failure contract", async () => {
      getSession.mockResolvedValue(null);

      const response = await patientReportRoute.GET(reportRequest());

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual(UNAUTHENTICATED_BODY);
    });
  });

  describe("admitted", () => {
    it("answers with admitted patients, not fabricated visit rows", async () => {
      const response = await admittedGET();

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual([
        expect.objectContaining({ id: "patient-2", patientType: "INPATIENT" }),
      ]);
    });

    it("rejects an unauthenticated read with the stable failure contract", async () => {
      getSession.mockResolvedValue(null);

      const response = await admittedGET();

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual(UNAUTHENTICATED_BODY);
    });
  });

  describe("roles", () => {
    it("answers every patient read with forbidden for an account that holds no patient permission", async () => {
      getSession.mockResolvedValue(sessionFor("PATIENT"));

      const responses = [
        await patientRoute.GET(listRequest()),
        await detailRequest("patient-1"),
        await admittedGET(),
        await patientReportRoute.GET(reportRequest()),
      ];

      for (const response of responses) {
        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual(FORBIDDEN_BODY);
      }
    });

    it("keeps the report behind its own permission", async () => {
      getSession.mockResolvedValue(sessionFor("USER"));

      await expect(patientRoute.GET(listRequest())).resolves.toMatchObject({
        status: 200,
      });
      await expect(
        patientReportRoute.GET(reportRequest()),
      ).resolves.toMatchObject({ status: 403 });
    });

    it("answers a deactivated account with forbidden, whatever role it kept", async () => {
      getSession.mockResolvedValue({
        ...sessionFor("ADMIN"),
        user: { ...sessionFor("ADMIN").user, isActive: false },
      });

      const response = await patientRoute.GET(listRequest());

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual(FORBIDDEN_BODY);
    });
  });
});
