import { beforeEach, describe, expect, it, vi } from "vitest";

class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT: ${url}`);
  }
}

const { table, getSession, revalidatePath, redirect } = await vi.hoisted(
  async () => {
    const { createAppointmentTable } = await import(
      "@/server/appointments/test-support/appointment-table"
    );

    return {
      table: createAppointmentTable(),
      getSession: vi.fn(),
      revalidatePath: vi.fn(),
      redirect: vi.fn(),
    };
  }
);

vi.mock("@/lib/prisma", () => ({ getPrisma: () => table.prisma }));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

import {
  checkInAppointment,
  restoreAppointment,
  createAppointment,
  archiveAppointment,
  updateAppointment,
} from "@/app/actions/appointment-actions";
import { FAILURE_CODES, FAILURE_MESSAGES } from "@/lib/action-result";

const SESSION = {
  session: { id: "session-1", userId: "user-1" },
  user: {
    id: "user-1",
    email: "reception@clinic.test",
    role: "RECEPTIONIST",
    isActive: true,
  },
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
  deletedAt: null as Date | null,
};

/** Only an administrator restores; see ADR 0005. */
const ADMIN = {
  ...SESSION,
  user: { ...SESSION.user, role: "ADMIN" },
};

const ARCHIVED_AT = new Date("2026-04-01T08:00:00.000Z");

const seed = (overrides: {
  archived?: Date | null;
  patientArchived?: boolean;
} = {}) => {
  // A fresh row each time: a command restores the row it finds in place, so a shared
  // fixture would come back already restored for the next case.
  table.appointments.splice(0, table.appointments.length, {
    ...APPOINTMENT,
    deletedAt: overrides.archived ?? null,
  });
  table.visits.splice(0, table.visits.length);
  table.patients.splice(0, table.patients.length, {
    id: "patient-1",
    patientCode: "PAT-001",
    firstName: "Ada",
    middleName: "Quincy",
    lastName: "Lovelace",
    deletedAt: overrides.patientArchived ? ARCHIVED_AT : null,
  });
  table.users.splice(0, table.users.length, {
    id: "user-1",
    name: "Reception",
    role: "RECEPTIONIST",
    deletedAt: null,
  });
  table.destroyed.splice(0, table.destroyed.length);
};

function appointmentForm(overrides: Record<string, string> = {}) {
  const form = new FormData();

  const fields: Record<string, string> = {
    id: "",
    patientId: "patient-1",
    startDateTime: "2026-03-02T09:00",
    endDateTime: "2026-03-02T09:30",
    appointmentType: "CLINIC",
    appointmentStatus: "SCHEDULED",
    reason: "Annual check",
    ...overrides,
  };

  for (const [name, value] of Object.entries(fields)) {
    form.append(name, value);
  }

  return form;
}

const signedOut = {
  ok: false,
  error: {
    code: FAILURE_CODES.UNAUTHENTICATED,
    message: FAILURE_MESSAGES.UNAUTHENTICATED,
  },
};

describe("appointment form commands", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    seed();
    revalidatePath.mockReset();
    redirect.mockReset().mockImplementation((url: string) => {
      throw new RedirectSignal(url);
    });
  });

  it("refuses every form command without a session", async () => {
    getSession.mockResolvedValue(null);

    await expect(createAppointment(appointmentForm())).resolves.toEqual(
      signedOut
    );
    await expect(
      updateAppointment(appointmentForm({ id: "appointment-1" }))
    ).resolves.toEqual(signedOut);
    await expect(archiveAppointment("appointment-1")).resolves.toEqual(
      signedOut
    );
    await expect(checkInAppointment("appointment-1")).resolves.toEqual(
      signedOut
    );

    expect(table.appointments).toEqual([APPOINTMENT]);
    expect(table.visits).toEqual([]);
    expect(redirect).not.toHaveBeenCalled();
  });

  describe("create", () => {
    it("rejects invalid input without writing", async () => {
      const result = await createAppointment(
        appointmentForm({ patientId: "", endDateTime: "" })
      );

      expect(result).toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.INVALID_INPUT },
      });
      expect(table.appointments).toEqual([APPOINTMENT]);
      expect(redirect).not.toHaveBeenCalled();
    });

    it("rejects an appointment that ends before it starts", async () => {
      const result = await createAppointment(
        appointmentForm({ endDateTime: "2026-03-02T08:00" })
      );

      expect(result).toMatchObject({
        ok: false,
        error: {
          code: FAILURE_CODES.INVALID_INPUT,
          fieldErrors: expect.objectContaining({
            endDateTime: ["The end must be after the start"],
          }),
        },
      });
      expect(table.appointments).toEqual([APPOINTMENT]);
    });

    it("reports which fields were rejected", async () => {
      const result = await createAppointment(
        appointmentForm({ patientId: "", reason: "" })
      );

      expect(result).toMatchObject({
        ok: false,
        error: {
          fieldErrors: expect.objectContaining({
            patientId: expect.any(Array),
          }),
        },
      });
    });

    it("stores a cleared reason as empty rather than keeping the old one", async () => {
      await expect(
        createAppointment(
          appointmentForm({
            patientId: "patient-1",
            reason: "",
            startDateTime: "2026-03-05T09:00",
            endDateTime: "2026-03-05T09:30",
          })
        )
      ).rejects.toBeInstanceOf(RedirectSignal);

      const created = table.appointments[1];

      expect(created).toMatchObject({ reason: null });
    });

    it("writes the parsed input, revalidates and redirects", async () => {
      await expect(
        createAppointment(
          appointmentForm({
            startDateTime: "2026-03-05T09:00",
            endDateTime: "2026-03-05T09:30",
            appointmentType: "IMAGING",
          })
        )
      ).rejects.toBeInstanceOf(RedirectSignal);

      const created = table.appointments[1];

      expect(created).toMatchObject({
        patientId: "patient-1",
        providerId: "user-1",
        startDateTime: new Date("2026-03-05T09:00:00Z"),
        endDateTime: new Date("2026-03-05T09:30:00Z"),
        appointmentType: "IMAGING",
        appointmentStatus: "SCHEDULED",
        reason: "Annual check",
      });
      expect(revalidatePath).toHaveBeenCalledWith("/appointments/all");
      expect(revalidatePath).toHaveBeenCalledWith("/appointments/calendar");
      expect(redirect).toHaveBeenCalledWith(`/appointments/${created?.id}`);
    });
  });

  describe("update", () => {
    it("rejects a submission without an appointment id", async () => {
      const result = await updateAppointment(appointmentForm({ id: "" }));

      expect(result).toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.INVALID_INPUT },
      });
      expect(table.appointments).toEqual([APPOINTMENT]);
    });

    it("updates the addressed appointment and redirects to it", async () => {
      await expect(
        updateAppointment(
          appointmentForm({
            id: "appointment-1",
            startDateTime: "2026-03-06T11:00",
            endDateTime: "2026-03-06T11:20",
            appointmentStatus: "CANCELLED",
          })
        )
      ).rejects.toBeInstanceOf(RedirectSignal);

      expect(table.findAppointment("appointment-1")).toMatchObject({
        startDateTime: new Date("2026-03-06T11:00:00Z"),
        endDateTime: new Date("2026-03-06T11:20:00Z"),
        appointmentStatus: "CANCELLED",
        patientId: "patient-1",
      });
      expect(redirect).toHaveBeenCalledWith("/appointments/appointment-1");
    });

    it("never moves an appointment to the patient the form submitted", async () => {
      table.patients.push({
        id: "patient-2",
        patientCode: "PAT-002",
        firstName: "Grace",
        middleName: "B",
        lastName: "Hopper",
        deletedAt: null,
      });

      await expect(
        updateAppointment(
          appointmentForm({ id: "appointment-1", patientId: "patient-2" })
        )
      ).rejects.toBeInstanceOf(RedirectSignal);

      expect(table.findAppointment("appointment-1")?.patientId).toBe(
        "patient-1"
      );
    });

    it("reports an archived or unknown appointment as not found", async () => {
      await expect(
        updateAppointment(appointmentForm({ id: "appointment-404" }))
      ).resolves.toEqual({
        ok: false,
        error: { code: FAILURE_CODES.NOT_FOUND, message: "Appointment not found" },
      });
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe("archive", () => {
    it("archives the appointment and reports it, so the client can invalidate", async () => {
      const result = await archiveAppointment("appointment-1");

      expect(result).toMatchObject({ ok: true, data: { id: "appointment-1" } });
      expect(revalidatePath).toHaveBeenCalledWith("/appointments/all");
      expect(revalidatePath).toHaveBeenCalledWith("/appointments/calendar");
      expect(redirect).not.toHaveBeenCalled();
    });

    it("never deletes the appointment row", async () => {
      await archiveAppointment("appointment-1");

      expect(table.destroyed).toEqual([]);
      expect(table.findAppointment("appointment-1")?.deletedAt).toBeInstanceOf(
        Date
      );
    });
  });

  describe("check in", () => {
    it("opens the visit and navigates to it", async () => {
      await expect(checkInAppointment("appointment-1")).rejects.toBeInstanceOf(
        RedirectSignal
      );

      const visit = table.visits[0];

      expect(visit).toMatchObject({ appointmentId: "appointment-1" });
      expect(table.findAppointment("appointment-1")?.appointmentStatus).toBe(
        "ATTENDED"
      );
      expect(revalidatePath).toHaveBeenCalledWith("/appointments/all");
      expect(redirect).toHaveBeenCalledWith(`/visits/${visit?.id}`);
    });

    it("reports the conflict instead of opening a second visit", async () => {
      await checkInAppointment("appointment-1").catch(() => undefined);

      await expect(checkInAppointment("appointment-1")).resolves.toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.CONFLICT,
          message: "This appointment has already been checked in.",
        },
      });
      expect(table.visits).toHaveLength(1);
    });
  });
  describe("restore", () => {
    beforeEach(() => {
      getSession.mockResolvedValue(ADMIN);
      seed({ archived: ARCHIVED_AT });
    });

    it("restores the appointment and revalidates the pages it returns to", async () => {
      const result = await restoreAppointment("appointment-1");

      expect(result).toMatchObject({ ok: true, data: { id: "appointment-1" } });
      expect(table.findAppointment("appointment-1")?.deletedAt).toBeNull();
      expect(revalidatePath).toHaveBeenCalledWith("/appointments/all");
      expect(revalidatePath).toHaveBeenCalledWith("/appointments/calendar");
      expect(redirect).not.toHaveBeenCalled();
    });

    it("refuses a clinician, who may archive an appointment but not bring one back", async () => {
      getSession.mockResolvedValue(SESSION);

      await expect(restoreAppointment("appointment-1")).resolves.toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.FORBIDDEN,
          message: FAILURE_MESSAGES.FORBIDDEN,
        },
      });
      expect(table.findAppointment("appointment-1")?.deletedAt).toEqual(
        ARCHIVED_AT,
      );
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("reports an appointment whose patient is still archived", async () => {
      // The archive unwinds from the top down, so this refusal is the answer, not a
      // fault: the archive screen shows the row with the patient to restore first.
      seed({ archived: ARCHIVED_AT, patientArchived: true });

      await expect(restoreAppointment("appointment-1")).resolves.toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.NOT_FOUND,
          message: "Appointment not found",
        },
      });
      expect(table.findAppointment("appointment-1")?.deletedAt).toEqual(
        ARCHIVED_AT,
      );
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });
});
