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

import { GET as detailGET } from "@/app/api/appointments/[id]/route";
import * as detailRoute from "@/app/api/appointments/[id]/route";
import * as appointmentRoute from "@/app/api/appointments/route";
import { FAILURE_CODES, FAILURE_MESSAGES } from "@/lib/action-result";

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

const UNAUTHENTICATED_BODY = {
  error: {
    code: FAILURE_CODES.UNAUTHENTICATED,
    message: FAILURE_MESSAGES.UNAUTHENTICATED,
  },
};

const listRequest = (query = "") =>
  new NextRequest(`http://localhost/api/appointments${query}`);

const detailRequest = (id: string) =>
  detailGET(new NextRequest(`http://localhost/api/appointments/${id}`), {
    params: Promise.resolve({ id }),
  });

describe("appointment read routes", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    table.appointments.splice(0, table.appointments.length, { ...APPOINTMENT });
    table.visits.splice(0, table.visits.length);
    table.patients.splice(0, table.patients.length, {
      id: "patient-1",
      patientCode: "PAT-001",
      firstName: "Ada",
      middleName: "Quincy",
      lastName: "Lovelace",
      deletedAt: null,
    });
    table.users.splice(0, table.users.length, {
      id: "user-1",
      name: "Dr Iris",
      role: "DOCTOR",
      deletedAt: null,
    });
  });

  it("serves reads only, with no duplicate write methods", () => {
    expect(Object.keys(appointmentRoute)).toEqual(["GET"]);
  });

  it("does not serve write methods on a single appointment", () => {
    expect(Object.keys(detailRoute)).toEqual(["GET"]);
  });

  it("answers a paged list read with the summary DTOs", async () => {
    const response = await appointmentRoute.GET(listRequest("?limit=5"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: "appointment-1",
        startDateTime: "2026-03-02T09:00:00.000Z",
        endDateTime: "2026-03-02T09:30:00.000Z",
        patient: expect.objectContaining({ firstName: "Ada" }),
        provider: { id: "user-1", name: "Dr Iris", role: "DOCTOR" },
        checkedIn: false,
      }),
    ]);
  });

  it("rejects an unauthenticated list read with the stable failure contract", async () => {
    getSession.mockResolvedValue(null);

    const response = await appointmentRoute.GET(listRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual(UNAUTHENTICATED_BODY);
  });

  it("answers a search read with only the appointments it found", async () => {
    table.patients[0] = {
      ...table.patients[0],
      lastName: "Byron",
    };

    const response = await appointmentRoute.GET(listRequest("?search=Byron"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([expect.objectContaining({ id: "appointment-1" })]);
  });

  it("answers a windowed read with every appointment in the window", async () => {
    table.appointments.push({
      ...APPOINTMENT,
      id: "appointment-2",
      startDateTime: new Date("2026-04-15T09:00:00.000Z"),
      endDateTime: new Date("2026-04-15T09:30:00.000Z"),
    });

    const response = await appointmentRoute.GET(
      listRequest("?from=2026-03-01T00:00:00.000Z&to=2026-04-01T00:00:00.000Z"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.map((read: { id: string }) => read.id)).toEqual([
      "appointment-1",
    ]);
  });

  it("refuses a window it cannot honour, rather than quietly reading a page", async () => {
    // A calendar that sent a half-open window backwards would otherwise be
    // answered with a page of the list: an empty-looking month that is really a
    // question the read refused to ask.
    const incomplete = await appointmentRoute.GET(
      listRequest("?from=2026-03-01T00:00:00.000Z"),
    );
    const inverted = await appointmentRoute.GET(
      listRequest("?from=2026-04-01T00:00:00.000Z&to=2026-03-01T00:00:00.000Z"),
    );
    const unparseable = await appointmentRoute.GET(
      listRequest("?from=yesterday&to=2026-04-01T00:00:00.000Z"),
    );

    for (const response of [incomplete, inverted, unparseable]) {
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: {
          code: FAILURE_CODES.INVALID_INPUT,
          message: FAILURE_MESSAGES[FAILURE_CODES.INVALID_INPUT],
        },
      });
    }
  });

  it("answers a detail read with the detail DTO", async () => {
    const response = await detailRequest("appointment-1");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: "appointment-1",
        reason: "Annual check",
        updatedAt: "2026-01-02T03:04:05.000Z",
      }),
    );
  });

  it("answers not found for a missing or archived appointment", async () => {
    const missing = await detailRequest("appointment-404");

    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({
      error: {
        code: FAILURE_CODES.NOT_FOUND,
        message: "Appointment not found",
      },
    });

    table.appointments[0] = {
      ...APPOINTMENT,
      deletedAt: new Date("2026-02-01T00:00:00.000Z"),
    };

    expect((await detailRequest("appointment-1")).status).toBe(404);
  });

  it("rejects an unauthenticated detail read with the stable failure contract", async () => {
    getSession.mockResolvedValue(null);

    const response = await detailRequest("appointment-1");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual(UNAUTHENTICATED_BODY);
  });

  it("answers every appointment read with forbidden for an account that holds no appointment permission", async () => {
    getSession.mockResolvedValue({
      ...SESSION,
      user: { ...SESSION.user, role: "PATIENT" },
    });

    const responses = [
      await appointmentRoute.GET(listRequest()),
      await detailRequest("appointment-1"),
    ];

    for (const response of responses) {
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        error: {
          code: FAILURE_CODES.FORBIDDEN,
          message: FAILURE_MESSAGES.FORBIDDEN,
        },
      });
    }
  });
});
