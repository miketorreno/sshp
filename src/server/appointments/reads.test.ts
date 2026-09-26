import { beforeEach, describe, expect, it, vi } from "vitest";

const { table, getSession } = await vi.hoisted(async () => {
  const { createAppointmentTable } = await import(
    "@/server/appointments/test-support/appointment-table"
  );

  return { table: createAppointmentTable(), getSession: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ default: table.prisma }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { FAILURE_CODES } from "@/lib/action-result";
import {
  getAppointmentDetail,
  listAppointments,
} from "@/server/appointments/reads";

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

const PROVIDER = {
  id: "user-1",
  name: "Dr Iris",
  role: "DOCTOR",
  deletedAt: null,
};

const appointment = (overrides: Record<string, unknown> = {}) => ({
  id: "appointment-1",
  patientId: "patient-1",
  providerId: "user-1",
  appointmentId: null,
  startDateTime: new Date("2026-03-02T09:00:00.000Z"),
  endDateTime: new Date("2026-03-02T09:30:00.000Z"),
  appointmentType: "CLINIC",
  appointmentStatus: "SCHEDULED",
  reason: "Annual check",
  createdAt: new Date("2026-01-02T03:04:05.000Z"),
  updatedAt: new Date("2026-01-02T03:04:05.000Z"),
  deletedAt: null,
  ...overrides,
});

const SESSION = {
  session: { id: "session-1", userId: "user-1" },
  user: { id: "user-1", email: "doctor@clinic.test" },
};

const seed = ({
  appointments = [appointment()],
  visits = [],
}: {
  appointments?: Record<string, unknown>[];
  visits?: Record<string, unknown>[];
} = {}) => {
  table.appointments.splice(
    0,
    table.appointments.length,
    ...appointments.map((row) => ({ ...row }))
  );
  table.visits.splice(
    0,
    table.visits.length,
    ...visits.map((row) => ({ ...row }))
  );
  table.patients.splice(0, table.patients.length, PATIENT, ARCHIVED_PATIENT);
  table.users.splice(0, table.users.length, PROVIDER);
  table.destroyed.splice(0, table.destroyed.length);
};

const detail = (id: string) => getAppointmentDetail(id);

describe("appointment reads", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    seed();
  });

  it("requires a session to read the list", async () => {
    getSession.mockResolvedValue(null);

    await expect(listAppointments()).rejects.toMatchObject({
      name: "UnauthenticatedError",
      failure: { code: FAILURE_CODES.UNAUTHENTICATED },
    });
  });

  it("requires a session to read a detail", async () => {
    getSession.mockResolvedValue(null);

    await expect(detail("appointment-1")).rejects.toMatchObject({
      name: "UnauthenticatedError",
      failure: { code: FAILURE_CODES.UNAUTHENTICATED },
    });
  });

  describe("list", () => {
    it("answers with the summary data the appointment views render", async () => {
      const [read] = await listAppointments();

      expect(read).toEqual({
        id: "appointment-1",
        patientId: "patient-1",
        providerId: "user-1",
        startDateTime: "2026-03-02T09:00:00.000Z",
        endDateTime: "2026-03-02T09:30:00.000Z",
        appointmentType: "CLINIC",
        appointmentStatus: "SCHEDULED",
        reason: "Annual check",
        patient: {
          id: "patient-1",
          patientCode: "PAT-001",
          firstName: "Ada",
          middleName: "Quincy",
          lastName: "Lovelace",
        },
        provider: { id: "user-1", name: "Dr Iris", role: "DOCTOR" },
        checkedIn: false,
        createdAt: "2026-01-02T03:04:05.000Z",
      });
    });

    it("never leaks the archive marker", async () => {
      const [read] = await listAppointments();

      expect(read).not.toHaveProperty("deletedAt");
      expect(read).not.toHaveProperty("updatedAt");
    });

    it("orders the soonest appointment first", async () => {
      seed({
        appointments: [
          appointment({ id: "appointment-2" }),
          appointment({
            id: "appointment-1",
            startDateTime: new Date("2026-01-02T09:00:00.000Z"),
            endDateTime: new Date("2026-01-02T09:30:00.000Z"),
          }),
        ],
      });

      const ids = (await listAppointments()).map((read) => read.id);

      expect(ids).toEqual(["appointment-1", "appointment-2"]);
    });

    it("hides archived appointments", async () => {
      seed({
        appointments: [
          appointment({ id: "appointment-2" }),
          appointment({
            id: "appointment-1",
            deletedAt: new Date("2026-02-01T00:00:00.000Z"),
          }),
        ],
      });

      const ids = (await listAppointments()).map((read) => read.id);

      expect(ids).toEqual(["appointment-2"]);
    });

    it("hides an appointment whose patient is archived", async () => {
      seed({
        appointments: [appointment({ patientId: "patient-2" })],
      });

      await expect(listAppointments()).resolves.toEqual([]);
    });

    it("reports an appointment that already has a visit as checked in", async () => {
      seed({
        visits: [{ id: "visit-1", appointmentId: "appointment-1" }],
      });

      const [read] = await listAppointments();

      expect(read?.checkedIn).toBe(true);
    });

    it("keeps an appointment checked in when its only visit is archived", async () => {
      seed({
        visits: [
          {
            id: "visit-1",
            appointmentId: "appointment-1",
            deletedAt: new Date("2026-02-01T00:00:00.000Z"),
          },
        ],
      });

      const [read] = await listAppointments();

      expect(read?.checkedIn).toBe(true);
    });

    it("pages and clamps the page size", async () => {
      seed({
        appointments: [
          appointment({ id: "appointment-1" }),
          appointment({ id: "appointment-2" }),
          appointment({ id: "appointment-3" }),
        ],
      });

      const firstPage = await listAppointments({ page: 1, limit: 2 });
      const lastPage = await listAppointments({ page: 2, limit: 2 });

      expect(firstPage.map((read) => read.id)).toEqual([
        "appointment-1",
        "appointment-2",
      ]);
      expect(lastPage.map((read) => read.id)).toEqual(["appointment-3"]);

      await expect(
        listAppointments({ page: 0, limit: 1000 })
      ).resolves.toHaveLength(3);
    });
  });

  describe("detail", () => {
    it("answers with the detail read model", async () => {
      await expect(detail("appointment-1")).resolves.toMatchObject({
        id: "appointment-1",
        provider: { name: "Dr Iris" },
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
    });

    it("answers no detail for a missing or archived appointment", async () => {
      await expect(detail("appointment-404")).resolves.toBeNull();

      table.appointments[0] = appointment({
        deletedAt: new Date("2026-02-01T00:00:00.000Z"),
      });

      await expect(detail("appointment-1")).resolves.toBeNull();
    });

    it("answers no detail for an appointment whose patient is archived", async () => {
      table.appointments[0] = appointment({ patientId: "patient-2" });

      await expect(detail("appointment-1")).resolves.toBeNull();
    });
  });
});
