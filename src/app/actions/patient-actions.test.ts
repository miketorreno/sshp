import { beforeEach, describe, expect, it, vi } from "vitest";

class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT: ${url}`);
  }
}

const { table, getSession, revalidatePath, redirect } = await vi.hoisted(
  async () => {
    const { createPatientTable } = await import(
      "@/server/patients/test-support/patient-table"
    );

    return {
      table: createPatientTable(),
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
  createPatient,
  deletePatient,
  updatePatient,
} from "@/app/actions/patient-actions";
import { FAILURE_CODES, FAILURE_MESSAGES } from "@/lib/action-result";

const SESSION = {
  session: { id: "session-1", userId: "user-1" },
  user: {
    id: "user-1",
    email: "doctor@clinic.test",
    role: "DOCTOR",
    isActive: true,
  },
};

const ACTIVE_PATIENT = {
  id: "patient-1",
  firstName: "Ada",
  middleName: "Quincy",
  lastName: "Lovelace",
  dateOfBirth: new Date("1815-12-10T00:00:00.000Z"),
  gender: "Female",
  bloodGroup: "O+",
  placeOfBirth: null,
  occupation: null,
  phone: null,
  email: "ada@clinic.test",
  address: null,
  country: null,
  guardian: null,
  referredBy: null,
  referredDate: null,
  patientCode: "PAT-001",
  patientType: "OUTPATIENT",
  createdAt: new Date("2026-01-02T03:04:05.000Z"),
  updatedAt: new Date("2026-01-02T03:04:05.000Z"),
  deletedAt: null as Date | null,
};

const seed = (...patients: Record<string, unknown>[]) => {
  table.rows.splice(0, table.rows.length, ...patients);
  table.destroyed.splice(0, table.destroyed.length);
};

function patientForm(overrides: Record<string, string> = {}) {
  const form = new FormData();

  const fields: Record<string, string> = {
    firstName: "Ada",
    middleName: "Quincy",
    lastName: "Lovelace",
    dateOfBirth: "1815-12-10",
    gender: "Female",
    bloodGroup: "O+",
    placeOfBirth: "",
    occupation: "",
    phone: "",
    email: "ada@clinic.test",
    address: "",
    country: "",
    guardian: "",
    referredBy: "",
    referredDate: "",
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

describe("patient form commands", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    seed(ACTIVE_PATIENT);
    revalidatePath.mockReset();
    redirect.mockReset().mockImplementation((url: string) => {
      throw new RedirectSignal(url);
    });
  });

  it("refuses every form command without a session", async () => {
    getSession.mockResolvedValue(null);

    await expect(createPatient(patientForm())).resolves.toEqual(signedOut);
    await expect(
      updatePatient(patientForm({ id: "patient-1" }))
    ).resolves.toEqual(signedOut);
    await expect(deletePatient("patient-1")).resolves.toEqual(signedOut);

    expect(table.rows).toEqual([ACTIVE_PATIENT]);
    expect(redirect).not.toHaveBeenCalled();
  });

  describe("create", () => {
    it("rejects invalid input without writing", async () => {
      const result = await createPatient(patientForm({ email: "not-an-email" }));

      expect(result).toMatchObject({
        ok: false,
        error: {
          code: FAILURE_CODES.INVALID_INPUT,
          message: FAILURE_MESSAGES.INVALID_INPUT,
        },
      });
      expect(table.rows).toEqual([ACTIVE_PATIENT]);
      expect(redirect).not.toHaveBeenCalled();
    });

    it("reports which fields were rejected", async () => {
      const result = await createPatient(
        patientForm({ firstName: "A", dateOfBirth: "" })
      );

      expect(result).toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.INVALID_INPUT,
          message: FAILURE_MESSAGES.INVALID_INPUT,
          fieldErrors: expect.objectContaining({
            firstName: expect.any(Array),
            dateOfBirth: expect.any(Array),
          }),
        },
      });
    });

    it("writes the parsed input, revalidates and redirects", async () => {
      await expect(
        createPatient(
          patientForm({
            email: "grace@clinic.test",
            phone: "555-0100",
            referredDate: "1816-01-02",
          })
        )
      ).rejects.toBeInstanceOf(RedirectSignal);

      const created = table.rows.find(
        (row) => row.email === "grace@clinic.test"
      );

      expect(created).toMatchObject({
        firstName: "Ada",
        dateOfBirth: new Date("1815-12-10T00:00:00.000Z"),
        phone: "555-0100",
        placeOfBirth: null,
        referredDate: new Date("1816-01-02T00:00:00.000Z"),
      });
      // Both server-rendered paths, because every report panel is derived from
      // the rows this write just changed.
      expect(revalidatePath.mock.calls.flat()).toEqual([
        "/patients/all",
        "/patients/reports",
      ]);
      expect(redirect).toHaveBeenCalledWith(`/patients/${created?.id}`);
    });
  });

  describe("update", () => {
    it("rejects a submission without a patient id", async () => {
      const result = await updatePatient(patientForm({ id: "" }));

      expect(result).toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.INVALID_INPUT },
      });
      expect(table.rows).toEqual([ACTIVE_PATIENT]);
    });

    it("updates the addressed patient and redirects to it", async () => {
      await expect(
        updatePatient(patientForm({ id: "patient-1", phone: "555-0100" }))
      ).rejects.toBeInstanceOf(RedirectSignal);

      expect(table.find("patient-1")).toMatchObject({
        email: "ada@clinic.test",
        phone: "555-0100",
      });
      expect(redirect).toHaveBeenCalledWith("/patients/patient-1");
    });

    it("reports an archived or unknown patient as not found", async () => {
      await expect(
        updatePatient(patientForm({ id: "patient-404" }))
      ).resolves.toEqual({
        ok: false,
        error: { code: FAILURE_CODES.NOT_FOUND, message: "Patient not found" },
      });
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("archives the patient and reports it, so the client can invalidate", async () => {
      const result = await deletePatient("patient-1");

      expect(result).toMatchObject({ ok: true, data: { id: "patient-1" } });

      if (result.ok) {
        expect(Number.isNaN(Date.parse(result.data.archivedAt))).toBe(false);
      }

      expect(revalidatePath.mock.calls.flat()).toEqual([
        "/patients/all",
        "/patients/reports",
      ]);
      expect(redirect).not.toHaveBeenCalled();
    });

    it("never deletes the patient row", async () => {
      await deletePatient("patient-1");

      expect(table.destroyed).toEqual([]);
      expect(table.find("patient-1")?.deletedAt).toBeInstanceOf(Date);
    });

    it("reports an unknown patient", async () => {
      await expect(deletePatient("patient-404")).resolves.toEqual({
        ok: false,
        error: { code: FAILURE_CODES.NOT_FOUND, message: "Patient not found" },
      });
    });
  });
});
