import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { table, getSession } = await vi.hoisted(async () => {
  const { createPatientTable } = await import(
    "@/server/patients/test-support/patient-table"
  );

  return { table: createPatientTable(), getSession: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ getPrisma: () => table.prisma }));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { FAILURE_CODES, FAILURE_MESSAGES } from "@/lib/action-result";
import {
  createPatient,
  archivePatient,
  restorePatient,
  updatePatient,
  type PatientInput,
} from "@/server/patients/commands";
import { getPatientDetail } from "@/server/patients/reads";

/** The shape the database raises when a unique index rejects a write. */
const uniqueConstraintError = (field: string) =>
  Object.assign(new Error("Unique constraint failed"), {
    code: "P2002",
    meta: { target: [field] },
  });

const INPUT: PatientInput = {
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
};

const ada = {
  ...INPUT,
  id: "patient-1",
  patientCode: "PAT-001",
  patientType: "OUTPATIENT",
  createdAt: new Date("2026-01-02T03:04:05.000Z"),
  updatedAt: new Date("2026-01-02T03:04:05.000Z"),
  deletedAt: null,
};

const archivedAda = {
  ...ada,
  id: "patient-2",
  deletedAt: new Date("2026-02-01T00:00:00.000Z") as Date | null,
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

const seed = (...patients: Record<string, unknown>[]) => {
  // Copied, because a write in one test would otherwise leave the shared fixture
  // archived for the next test that seeds it.
  table.rows.splice(
    0,
    table.rows.length,
    ...patients.map((patient) => ({ ...patient }))
  );
  table.destroyed.splice(0, table.destroyed.length);
};

const findByEmail = (email: string) =>
  table.rows.find((row) => row.email === email);

const signedOut = {
  ok: false,
  error: {
    code: FAILURE_CODES.UNAUTHENTICATED,
    message: FAILURE_MESSAGES.UNAUTHENTICATED,
  },
};

const notFound = {
  ok: false,
  error: { code: FAILURE_CODES.NOT_FOUND, message: "Patient not found" },
};

const forbidden = {
  ok: false,
  error: {
    code: FAILURE_CODES.FORBIDDEN,
    message: FAILURE_MESSAGES.FORBIDDEN,
  },
};

/** The signed-in clinician, holding a different role. */
const sessionFor = (role: string) => ({
  ...SESSION,
  user: { ...SESSION.user, role },
});

const emailTaken = {
  ok: false,
  error: {
    code: FAILURE_CODES.CONFLICT,
    message: "A patient with that email is already registered.",
  },
};

describe("patient write commands", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    seed(ada, archivedAda);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refuses every write without a session", async () => {
    getSession.mockResolvedValue(null);

    const results = await Promise.all([
      createPatient({ ...INPUT, email: "new@clinic.test" }),
      updatePatient("patient-1", INPUT),
      archivePatient("patient-1"),
    ]);

    for (const result of results) {
      expect(result).toEqual(signedOut);
    }

    expect(table.rows).toHaveLength(2);
    expect(table.rows[0]).toEqual(ada);
  });

  it("refuses a write and an archive to an account that holds neither permission", async () => {
    getSession.mockResolvedValue(sessionFor("LAB_TECHNICIAN"));

    await expect(createPatient(INPUT)).resolves.toEqual(forbidden);
    await expect(updatePatient("patient-1", INPUT)).resolves.toEqual(forbidden);
    await expect(archivePatient("patient-1")).resolves.toEqual(forbidden);

    expect(table.rows[0]).toEqual(ada);
  });

  it("refuses a restore to anyone but an administrator", async () => {
    getSession.mockResolvedValue(sessionFor("DOCTOR"));

    await expect(restorePatient("patient-2")).resolves.toEqual(forbidden);

    expect(table.rows[1]).toEqual(archivedAda);
  });

  describe("create", () => {
    it("records the patient as a readable row", async () => {
      const result = await createPatient({
        ...INPUT,
        email: "grace@clinic.test",
        phone: "555-0100",
      });

      expect(result.ok).toBe(true);

      const created = findByEmail("grace@clinic.test");

      expect(created).toMatchObject({
        firstName: "Ada",
        email: "grace@clinic.test",
        phone: "555-0100",
        deletedAt: null,
      });
      expect(created?.id).toEqual(expect.any(String));
      expect(created?.patientCode).toEqual(expect.any(String));
    });

    it("reads back through the patient reads", async () => {
      await createPatient({ ...INPUT, email: "grace@clinic.test" });

      await expect(
        getPatientDetail(String(findByEmail("grace@clinic.test")?.id))
      ).resolves.toMatchObject({ email: "grace@clinic.test" });
    });

    it("keeps an archived patient's identity reserved", async () => {
      seed(archivedAda);

      await expect(createPatient(INPUT)).resolves.toEqual(emailTaken);
      expect(table.rows).toHaveLength(1);
    });

    it("never leaks an unexpected database error", async () => {
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(table.prisma.patient, "create").mockRejectedValue(
        new Error("connection reset")
      );

      await expect(
        createPatient({ ...INPUT, email: "grace@clinic.test" })
      ).resolves.toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.FAILURE,
          message: FAILURE_MESSAGES.FAILURE,
        },
      });

      expect(logged).toHaveBeenCalled();
    });

    it("reports a unique email clash as the email conflict", async () => {
      vi.spyOn(table.prisma.patient, "create").mockRejectedValue(
        uniqueConstraintError("email")
      );

      await expect(
        createPatient({ ...INPUT, email: "grace@clinic.test" })
      ).resolves.toEqual(emailTaken);
    });

    it("does not blame the email for a clash on another identity field", async () => {
      vi.spyOn(table.prisma.patient, "create").mockRejectedValue(
        uniqueConstraintError("patientCode")
      );

      await expect(
        createPatient({ ...INPUT, email: "grace@clinic.test" })
      ).resolves.toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.FAILURE,
          message: FAILURE_MESSAGES.FAILURE,
        },
      });
    });
  });

  describe("update", () => {
    it("updates the addressed patient", async () => {
      const result = await updatePatient("patient-1", {
        ...INPUT,
        phone: "555-0100",
      });

      expect(result).toEqual({ ok: true, data: { id: "patient-1" } });
      expect(table.find("patient-1")).toMatchObject({
        phone: "555-0100",
        email: "ada@clinic.test",
      });
    });

    it("reports a missing or archived patient as not found", async () => {
      await expect(updatePatient("patient-404", INPUT)).resolves.toEqual(
        notFound
      );
      await expect(updatePatient(archivedAda.id, INPUT)).resolves.toEqual(
        notFound
      );
      expect(table.find(archivedAda.id)).toEqual(archivedAda);
    });

    it("rejects taking over another patient's email", async () => {
      seed(ada, { ...ada, id: "patient-9", email: "taken@clinic.test" });

      await expect(
        updatePatient("patient-1", { ...INPUT, email: "taken@clinic.test" })
      ).resolves.toEqual(emailTaken);

      expect(table.find("patient-1")?.email).toBe("ada@clinic.test");
    });

    it("lets a patient keep its own email", async () => {
      await expect(
        updatePatient("patient-1", { ...INPUT, phone: "555-0100" })
      ).resolves.toEqual({ ok: true, data: { id: "patient-1" } });
    });
  });

  describe("delete", () => {
    it("archives the patient instead of destroying it", async () => {
      const result = await archivePatient("patient-1");

      expect(result.ok).toBe(true);
      expect(table.destroyed).toEqual([]);
      const archivedAt = table.find("patient-1")?.deletedAt;

      expect(archivedAt).toBeInstanceOf(Date);
      expect(result).toEqual({
        ok: true,
        data: { id: "patient-1", archivedAt: (archivedAt as Date).toISOString() },
      });
    });

    it("keeps the patient identity reserved after archiving", async () => {
      await archivePatient("patient-1");

      const result = await createPatient({
        ...INPUT,
        email: "grace@clinic.test",
      });

      expect(result).toEqual({
        ok: true,
        data: { id: findByEmail("grace@clinic.test")?.id },
      });

      await expect(updatePatient("patient-1", INPUT)).resolves.toEqual(
        notFound
      );
    });

    it("is idempotent for an already archived patient", async () => {
      const result = await archivePatient(archivedAda.id);

      expect(result).toEqual({
        ok: true,
        data: {
          id: archivedAda.id,
          archivedAt: (archivedAda.deletedAt as Date).toISOString(),
        },
      });
      expect(table.find(archivedAda.id)).toEqual(archivedAda);
    });

    it("reports an unknown patient as not found", async () => {
      await expect(archivePatient("patient-404")).resolves.toEqual(notFound);
      expect(table.destroyed).toEqual([]);
    });
  });

  describe("restore", () => {
    beforeEach(() => {
      getSession.mockResolvedValue(sessionFor("ADMIN"));
    });

    it("brings an archived patient back into the reads", async () => {
      const result = await restorePatient(archivedAda.id);

      expect(result.ok).toBe(true);
      expect(table.find(archivedAda.id)?.deletedAt).toBeNull();
      await expect(getPatientDetail(archivedAda.id)).resolves.toMatchObject({
        id: archivedAda.id,
      });
    });

    it("is idempotent for a patient who is already active", async () => {
      const result = await restorePatient(ada.id);

      expect(result).toEqual({ ok: true, data: { id: ada.id, restoredAt: null } });
      expect(table.find(ada.id)?.deletedAt).toBeNull();
    });

    it("reports an unknown patient as not found", async () => {
      await expect(restorePatient("patient-404")).resolves.toEqual(notFound);
    });
  });
});
