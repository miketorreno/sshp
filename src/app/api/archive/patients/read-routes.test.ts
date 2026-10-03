import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { table, getSession } = await vi.hoisted(async () => {
  const { createPatientTable } = await import(
    "@/server/patients/test-support/patient-table"
  );

  return { table: createPatientTable(), getSession: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ getPrisma: () => table.prisma }));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import * as archiveRoute from "@/app/api/archive/patients/route";
import {
  FAILURE_CODES,
  FAILURE_MESSAGES,
} from "@/lib/action-result";

/**
 * The archived patients, as the browser reads them.
 *
 * Worth a route of its own because the archive screen cannot be built from any other
 * read: every patient list in the app filters archived rows out, and this is the one
 * that lists them.
 */

const PATIENT = {
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

const SESSION = {
  session: { id: "session-1", userId: "user-1" },
  user: {
    id: "user-1",
    email: "doctor@clinic.test",
    role: "DOCTOR",
    isActive: true,
  },
};

const ARCHIVED_AT = new Date("2026-04-01T08:00:00.000Z");

const request = (query = "") =>
  new NextRequest(`http://localhost/api/archive/patients${query}`);

const UNAUTHENTICATED_BODY = {
  error: {
    code: FAILURE_CODES.UNAUTHENTICATED,
    message: FAILURE_MESSAGES.UNAUTHENTICATED,
  },
};

const FORBIDDEN_BODY = {
  error: { code: FAILURE_CODES.FORBIDDEN, message: FAILURE_MESSAGES.FORBIDDEN },
};

describe("archived patient route", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    table.rows.splice(
      0,
      table.rows.length,
      PATIENT,
      {
        ...PATIENT,
        id: "patient-2",
        patientCode: "PAT-002",
        email: "grace@clinic.test",
        deletedAt: ARCHIVED_AT,
      },
    );
  });

  it("serves reads only, with no duplicate write methods", () => {
    expect(Object.keys(archiveRoute)).toEqual(["GET"]);
  });

  it("answers with the archived patients, most recently archived first", async () => {
    const response = await archiveRoute.GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      rows: [
        {
          id: "patient-2",
          patientCode: "PAT-002",
          firstName: "Ada",
          lastName: "Lovelace",
          dateOfBirth: "1815-12-10T00:00:00.000Z",
          gender: "Female",
          patientType: "OUTPATIENT",
          archivedAt: "2026-04-01T08:00:00.000Z",
          restoreBlockedBy: null,
        },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 1,
    });
  });

  it("reads the page and the limit off the query string", async () => {
    const response = await archiveRoute.GET(request("?page=1&limit=5"));

    await expect(response.json()).resolves.toMatchObject({
      page: 1,
      pageSize: 5,
    });
  });

  it("serves the first page for a page it cannot read", async () => {
    // A reader who typed something odd should still get a list rather than an error,
    // so an unreadable page falls back the same way it does in every other read.
    const response = await archiveRoute.GET(request("?page=two&limit=lots"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      page: 1,
      pageSize: 20,
    });
  });

  it("rejects an unauthenticated read with the stable failure contract", async () => {
    getSession.mockResolvedValue(null);

    const response = await archiveRoute.GET(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual(UNAUTHENTICATED_BODY);
  });

  it("rejects a session that cannot archive", async () => {
    getSession.mockResolvedValue({
      ...SESSION,
      user: { ...SESSION.user, role: "USER" },
    });

    const response = await archiveRoute.GET(request());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual(FORBIDDEN_BODY);
  });
});