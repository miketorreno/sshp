import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { table, getSession } = await vi.hoisted(async () => {
  const { createPatientTable } = await import(
    "@/server/patients/test-support/patient-table"
  );

  return { table: createPatientTable(), getSession: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ default: table.prisma }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { GET as admittedGET } from "@/app/api/patients/admitted/route";
import { GET as detailGET } from "@/app/api/patients/[id]/route";
import * as patientRoute from "@/app/api/patients/route";
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
  user: { id: "user-1", email: "doctor@clinic.test" },
};

const listRequest = (query = "") =>
  new NextRequest(`http://localhost/api/patients${query}`);

const detailRequest = (id: string) => detailGET(new NextRequest(`http://localhost/api/patients/${id}`), { params: Promise.resolve({ id }) });

const UNAUTHENTICATED_BODY = {
  error: {
    code: FAILURE_CODES.UNAUTHENTICATED,
    message: FAILURE_MESSAGES.UNAUTHENTICATED,
  },
};

describe("patient read routes", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    table.rows.splice(
      0,
      table.rows.length,
      PATIENT,
      {
        ...PATIENT,
        id: "patient-2",
        firstName: "Grace",
        lastName: "Hopper",
        email: "grace@clinic.test",
        patientType: "INPATIENT",
      }
    );
  });

  it("serves reads only, with no duplicate write methods", () => {
    expect(Object.keys(patientRoute)).toEqual(["GET"]);
  });

  describe("list and search", () => {
    it("answers a paged list read with summary DTOs", async () => {
      const response = await patientRoute.GET(listRequest("?page=1&limit=1"));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual([
        expect.objectContaining({
          id: "patient-1",
          dateOfBirth: "1815-12-10T00:00:00.000Z",
          createdAt: "2026-01-02T03:04:05.000Z",
        }),
      ]);
    });

    it("serves search from the same route", async () => {
      const response = await patientRoute.GET(listRequest("?query=ada"));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual([
        expect.objectContaining({ id: "patient-1" }),
      ]);
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
});
