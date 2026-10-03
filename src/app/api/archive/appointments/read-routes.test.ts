import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { table, getSession } = await vi.hoisted(async () => {
  const { createAppointmentTable } = await import(
    "@/server/appointments/test-support/appointment-table"
  );

  return { table: createAppointmentTable(), getSession: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ getPrisma: () => table.prisma }));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import * as archiveRoute from "@/app/api/archive/appointments/route";
import {
  FAILURE_CODES,
  FAILURE_MESSAGES,
} from "@/lib/action-result";

/**
 * The archived appointments, as the browser reads them.
 *
 * The only route that reaches an appointment whose patient is archived: the calendar
 * and the day list both filter those out with the rest of the archived records.
 */

const PATIENT = {
  id: "patient-1",
  patientCode: "PAT-001",
  firstName: "Ada",
  middleName: "Quincy",
  lastName: "Lovelace",
  deletedAt: null,
};

const ARCHIVED_PATIENT = {
  ...PATIENT,
  id: "patient-2",
  patientCode: "PAT-002",
  firstName: "Grace",
  deletedAt: new Date("2026-02-01T00:00:00.000Z") as Date | null,
};

const APPOINTMENT = {
  id: "appointment-1",
  patientId: "patient-1",
  providerId: "user-1",
  startDateTime: new Date("2026-03-02T09:00:00.000Z"),
  endDateTime: new Date("2026-03-02T09:30:00.000Z"),
  appointmentType: "CLINIC",
  appointmentStatus: "SCHEDULED",
  reason: "Annual check",
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
  new NextRequest(`http://localhost/api/archive/appointments${query}`);

const UNAUTHENTICATED_BODY = {
  error: {
    code: FAILURE_CODES.UNAUTHENTICATED,
    message: FAILURE_MESSAGES.UNAUTHENTICATED,
  },
};

const FORBIDDEN_BODY = {
  error: { code: FAILURE_CODES.FORBIDDEN, message: FAILURE_MESSAGES.FORBIDDEN },
};

describe("archived appointment route", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    table.appointments.splice(0, table.appointments.length, {
      ...APPOINTMENT,
      deletedAt: ARCHIVED_AT,
    });
    table.visits.splice(0, table.visits.length);
    table.patients.splice(0, table.patients.length, PATIENT, ARCHIVED_PATIENT);
    table.users.splice(0, table.users.length);
  });

  it("serves reads only, with no duplicate write methods", () => {
    expect(Object.keys(archiveRoute)).toEqual(["GET"]);
  });

  it("answers with the archived appointments", async () => {
    const response = await archiveRoute.GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      rows: [
        {
          id: "appointment-1",
          startDateTime: "2026-03-02T09:00:00.000Z",
          endDateTime: "2026-03-02T09:30:00.000Z",
          appointmentType: "CLINIC",
          appointmentStatus: "SCHEDULED",
          reason: "Annual check",
          patient: { id: "patient-1", name: "Ada Quincy Lovelace" },
          archivedAt: "2026-04-01T08:00:00.000Z",
          restoreBlockedBy: null,
        },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 1,
    });
  });

  it("names the patient to restore first when the patient is archived too", async () => {
    table.appointments.splice(0, table.appointments.length, {
      ...APPOINTMENT,
      patientId: "patient-2",
      deletedAt: ARCHIVED_AT,
    });

    const response = await archiveRoute.GET(request());

    await expect(response.json()).resolves.toMatchObject({
      rows: [
        {
          patient: { id: "patient-2", name: "Grace Quincy Lovelace" },
          restoreBlockedBy: {
            recordType: "Patient",
            id: "patient-2",
            patientName: "Grace Quincy Lovelace",
          },
        },
      ],
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