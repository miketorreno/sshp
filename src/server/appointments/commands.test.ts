import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { table, getSession } = await vi.hoisted(async () => {
  const { createAppointmentTable } = await import(
    "@/server/appointments/test-support/appointment-table"
  );

  return { table: createAppointmentTable(), getSession: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ getPrisma: () => table.prisma }));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { FAILURE_CODES, FAILURE_MESSAGES } from "@/lib/action-result";
import {
  checkInAppointment,
  createAppointment,
  deleteAppointment,
  updateAppointment,
  type AppointmentEdit,
  type AppointmentInput,
} from "@/server/appointments/commands";
import { getAppointmentDetail } from "@/server/appointments/reads";

const INPUT: AppointmentInput = {
  patientId: "patient-1",
  startDateTime: new Date("2026-03-02T09:00:00.000Z"),
  endDateTime: new Date("2026-03-02T09:30:00.000Z"),
  appointmentType: "CLINIC",
  appointmentStatus: "SCHEDULED",
  reason: "Annual check",
};

const EDIT: AppointmentEdit = {
  startDateTime: INPUT.startDateTime,
  endDateTime: INPUT.endDateTime,
  appointmentType: INPUT.appointmentType,
  appointmentStatus: INPUT.appointmentStatus,
  reason: INPUT.reason,
};

const APPOINTMENT = {
  id: "appointment-1",
  patientId: "patient-1",
  providerId: "user-1",
  appointmentId: null,
  startDateTime: INPUT.startDateTime,
  endDateTime: INPUT.endDateTime,
  appointmentType: "CLINIC",
  appointmentStatus: "SCHEDULED",
  reason: "Annual check",
  createdAt: new Date("2026-01-02T03:04:05.000Z"),
  updatedAt: new Date("2026-01-02T03:04:05.000Z"),
  deletedAt: null as Date | null,
};

const ARCHIVED = {
  ...APPOINTMENT,
  id: "appointment-2",
  deletedAt: new Date("2026-02-01T00:00:00.000Z") as Date | null,
};

const PATIENT = {
  id: "patient-1",
  patientCode: "PAT-001",
  firstName: "Ada",
  middleName: "Quincy",
  lastName: "Lovelace",
  deletedAt: null as Date | null,
};

const ARCHIVED_PATIENT = {
  ...PATIENT,
  id: "patient-2",
  deletedAt: new Date("2026-02-01T00:00:00.000Z") as Date | null,
};

const SESSION = {
  session: { id: "session-1", userId: "user-1" },
  user: { id: "user-1", email: "reception@clinic.test" },
};

const seed = ({
  appointments = [APPOINTMENT, ARCHIVED],
  visits = [],
  patients = [PATIENT, ARCHIVED_PATIENT],
}: {
  appointments?: Record<string, unknown>[];
  visits?: Record<string, unknown>[];
  patients?: Record<string, unknown>[];
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
  table.patients.splice(
    0,
    table.patients.length,
    ...patients.map((row) => ({ ...row }))
  );
  table.users.splice(0, table.users.length, {
    id: "user-1",
    name: "Reception",
    role: "RECEPTIONIST",
    deletedAt: null,
  });
  table.destroyed.splice(0, table.destroyed.length);
};

const signedOut = {
  ok: false,
  error: {
    code: FAILURE_CODES.UNAUTHENTICATED,
    message: FAILURE_MESSAGES.UNAUTHENTICATED,
  },
};

const notFound = {
  ok: false,
  error: { code: FAILURE_CODES.NOT_FOUND, message: "Appointment not found" },
};

const alreadyCheckedIn = {
  ok: false,
  error: {
    code: FAILURE_CODES.CONFLICT,
    message: "This appointment has already been checked in.",
  },
};

const patientNotFound = {
  ok: false,
  error: {
    code: FAILURE_CODES.NOT_FOUND,
    message: "The selected patient is not an active patient.",
  },
};

describe("appointment write commands", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    seed();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refuses every write without a session", async () => {
    getSession.mockResolvedValue(null);

    const results = await Promise.all([
      createAppointment({ ...INPUT, patientId: "patient-1" }),
      updateAppointment("appointment-1", EDIT),
      deleteAppointment("appointment-1"),
      checkInAppointment("appointment-1"),
    ]);

    for (const result of results) {
      expect(result).toEqual(signedOut);
    }

    expect(table.appointments).toHaveLength(2);
    expect(table.appointments[0]).toEqual(APPOINTMENT);
    expect(table.visits).toEqual([]);
  });

  describe("create", () => {
    it("records an appointment for an active patient and reads it back", async () => {
      const result = await createAppointment({
        ...INPUT,
        startDateTime: new Date("2026-03-03T10:00:00.000Z"),
        endDateTime: new Date("2026-03-03T10:30:00.000Z"),
      });

      expect(result.ok).toBe(true);

      const created = table.appointments.find(
        (row) => row.id !== APPOINTMENT.id && row.id !== ARCHIVED.id
      );

      expect(created).toMatchObject({
        patientId: "patient-1",
        startDateTime: new Date("2026-03-03T10:00:00.000Z"),
        appointmentType: "CLINIC",
        appointmentStatus: "SCHEDULED",
        reason: "Annual check",
        deletedAt: null,
      });

      await expect(
        getAppointmentDetail(String(created?.id))
      ).resolves.toMatchObject({ patientId: "patient-1", checkedIn: false });
    });

    it("attributes the appointment to the signed-in staff member", async () => {
      await createAppointment(INPUT);

      const created = table.appointments.find(
        (row) => row.id !== APPOINTMENT.id && row.id !== ARCHIVED.id
      );

      expect(created?.providerId).toBe("user-1");
    });

    it("refuses a patient who is missing or archived", async () => {
      await expect(
        createAppointment({ ...INPUT, patientId: "patient-404" })
      ).resolves.toEqual(patientNotFound);

      await expect(
        createAppointment({ ...INPUT, patientId: "patient-2" })
      ).resolves.toEqual(patientNotFound);

      expect(table.appointments).toHaveLength(2);
    });

    it("never leaks an unexpected database error", async () => {
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(table.prisma.appointment, "create").mockRejectedValue(
        new Error("connection reset")
      );

      await expect(createAppointment(INPUT)).resolves.toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.FAILURE,
          message: FAILURE_MESSAGES.FAILURE,
        },
      });

      expect(logged).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("updates the addressed appointment", async () => {
      const result = await updateAppointment("appointment-1", {
        ...EDIT,
        startDateTime: new Date("2026-03-04T08:00:00.000Z"),
        endDateTime: new Date("2026-03-04T08:45:00.000Z"),
        appointmentStatus: "CANCELLED",
        reason: "Patient rescheduled",
      });

      expect(result).toEqual({ ok: true, data: { id: "appointment-1" } });
      expect(table.findAppointment("appointment-1")).toMatchObject({
        patientId: "patient-1",
        providerId: "user-1",
        startDateTime: new Date("2026-03-04T08:00:00.000Z"),
        appointmentStatus: "CANCELLED",
        reason: "Patient rescheduled",
      });
    });

    it("never moves an appointment to another patient", async () => {
      await updateAppointment("appointment-1", EDIT);

      expect(table.findAppointment("appointment-1")?.patientId).toBe(
        "patient-1"
      );
    });

    it("reports a missing or archived appointment as not found", async () => {
      await expect(updateAppointment("appointment-404", EDIT)).resolves.toEqual(
        notFound
      );
      await expect(updateAppointment(ARCHIVED.id, EDIT)).resolves.toEqual(
        notFound
      );
    });

    it("reports an appointment whose patient is archived as not found", async () => {
      table.appointments[0] = { ...APPOINTMENT, patientId: "patient-2" };

      await expect(updateAppointment("appointment-1", EDIT)).resolves.toEqual(
        notFound
      );
    });
  });

  describe("delete", () => {
    it("archives the appointment instead of destroying it", async () => {
      const result = await deleteAppointment("appointment-1");

      expect(result.ok).toBe(true);
      expect(table.destroyed).toEqual([]);

      const archivedAt = table.findAppointment("appointment-1")?.deletedAt;

      expect(archivedAt).toBeInstanceOf(Date);
      expect(result).toEqual({
        ok: true,
        data: {
          id: "appointment-1",
          archivedAt: (archivedAt as Date).toISOString(),
        },
      });
    });

    it("takes the appointment out of the normal reads", async () => {
      await deleteAppointment("appointment-1");

      await expect(getAppointmentDetail("appointment-1")).resolves.toBeNull();
    });

    it("is idempotent for an already archived appointment", async () => {
      const result = await deleteAppointment(ARCHIVED.id);

      expect(result).toEqual({
        ok: true,
        data: {
          id: ARCHIVED.id,
          archivedAt: (ARCHIVED.deletedAt as Date).toISOString(),
        },
      });
      expect(table.findAppointment(ARCHIVED.id)).toEqual(ARCHIVED);
    });

    it("reports an unknown appointment as not found", async () => {
      await expect(deleteAppointment("appointment-404")).resolves.toEqual(
        notFound
      );
      expect(table.destroyed).toEqual([]);
    });
  });

  describe("check in", () => {
    it("links a visit to the appointment and marks it attended", async () => {
      const result = await checkInAppointment("appointment-1");

      expect(result.ok).toBe(true);

      const visit = table.visits[0];

      expect(visit).toMatchObject({
        patientId: "patient-1",
        providerId: "user-1",
        createdById: "user-1",
        appointmentId: "appointment-1",
        visitType: "CLINIC",
        startDateTime: APPOINTMENT.startDateTime,
        reason: "Annual check",
      });
      expect(table.findAppointment("appointment-1")?.appointmentStatus).toBe(
        "ATTENDED"
      );

      await expect(
        getAppointmentDetail("appointment-1")
      ).resolves.toMatchObject({ checkedIn: true, appointmentStatus: "ATTENDED" });
    });

    it("opens the visit at the appointment's start time as a matching visit type", async () => {
      table.appointments[0] = {
        ...APPOINTMENT,
        appointmentType: "IMAGING",
      };

      await checkInAppointment("appointment-1");

      expect(table.visits[0]).toMatchObject({
        visitType: "IMAGING",
        startDateTime: APPOINTMENT.startDateTime,
      });
    });

    it("keeps the appointment's own provider as the visit provider", async () => {
      table.users.push({ id: "user-2", name: "Dr Iris", role: "DOCTOR" });
      table.appointments[0] = { ...APPOINTMENT, providerId: "user-2" };

      await checkInAppointment("appointment-1");

      expect(table.visits[0]?.providerId).toBe("user-2");
    });

    it("leaves no visit behind when marking the appointment fails", async () => {
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(table.prisma.appointment, "update").mockRejectedValue(
        new Error("connection reset")
      );

      const result = await checkInAppointment("appointment-1");

      expect(result).toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.FAILURE,
          message: FAILURE_MESSAGES.FAILURE,
        },
      });
      expect(table.visits).toEqual([]);
      expect(table.findAppointment("appointment-1")?.appointmentStatus).toBe(
        "SCHEDULED"
      );
      expect(logged).toHaveBeenCalled();
    });

    it("refuses to check the same appointment in twice", async () => {
      await checkInAppointment("appointment-1");
      await expect(checkInAppointment("appointment-1")).resolves.toEqual(
        alreadyCheckedIn
      );

      expect(table.visits).toHaveLength(1);
    });

    it("keeps an appointment checked in when its visit is archived", async () => {
      seed({
        visits: [
          {
            id: "visit-1",
            appointmentId: "appointment-1",
            deletedAt: new Date("2026-02-01T00:00:00.000Z"),
          },
        ],
      });

      await expect(checkInAppointment("appointment-1")).resolves.toEqual(
        alreadyCheckedIn
      );
      expect(table.visits).toHaveLength(1);
    });

    it("reports a missing, archived or inactive appointment as not found", async () => {
      await expect(checkInAppointment("appointment-404")).resolves.toEqual(
        notFound
      );
      await expect(checkInAppointment(ARCHIVED.id)).resolves.toEqual(notFound);

      table.appointments[0] = { ...APPOINTMENT, patientId: "patient-2" };

      await expect(checkInAppointment("appointment-1")).resolves.toEqual(
        notFound
      );
      expect(table.visits).toEqual([]);
    });
  });
});
