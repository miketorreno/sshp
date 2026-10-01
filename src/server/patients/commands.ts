import { getPrisma } from "@/lib/prisma";
import {
  actionSuccess,
  internalFailure,
  knownFailure,
  type ActionFailureResult,
  type ActionResult,
} from "@/lib/action-result";
import { PERMISSIONS, authorize } from "@/server/access";
import { PATIENT_EMAIL_TAKEN, PATIENT_NOT_FOUND } from "./contract";

/**
 * Patient write commands. Each one requires a session holding the permission its
 * change needs, validates through the caller-supplied input, and answers with a
 * stable result instead of throwing.
 *
 * Deleting a patient archives it: the row, its email, and its patient code stay
 * reserved, and normal reads stop returning it.
 */

export type PatientInput = {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  bloodGroup: string | null;
  placeOfBirth: string | null;
  occupation: string | null;
  phone: string | null;
  email: string;
  address: string | null;
  country: string | null;
  guardian: string | null;
  referredBy: string | null;
  referredDate: Date | null;
};

export type PatientWriteResult = { id: string };

export type PatientArchiveResult = { id: string; archivedAt: string };

/**
 * `restoredAt` is null when the patient was already active, so a retried restore
 * reports that there was no archive left to reverse rather than inventing a second
 * moment the patient came back.
 */
export type PatientRestoreResult = { id: string; restoredAt: string | null };

export async function createPatient(
  input: PatientInput
): Promise<ActionResult<PatientWriteResult>> {
  const actor = await authorize(PERMISSIONS.PATIENTS_WRITE);
  if (!actor.ok) return actor;

  if (await emailIsTaken(input.email)) return knownFailure(PATIENT_EMAIL_TAKEN);

  try {
    const created = await getPrisma().patient.create({ data: input });

    return actionSuccess({ id: created.id });
  } catch (error) {
    return writeFailure(error);
  }
}

export async function updatePatient(
  patientId: string,
  input: PatientInput
): Promise<ActionResult<PatientWriteResult>> {
  const actor = await authorize(PERMISSIONS.PATIENTS_WRITE);
  if (!actor.ok) return actor;

  const patient = await getPrisma().patient.findFirst({
    where: { id: patientId, deletedAt: null },
  });

  if (!patient) return knownFailure(PATIENT_NOT_FOUND);

  if (await emailIsTaken(input.email, patient.id))
    return knownFailure(PATIENT_EMAIL_TAKEN);

  try {
    const updated = await getPrisma().patient.update({
      where: { id: patient.id },
      data: input,
    });

    return actionSuccess({ id: updated.id });
  } catch (error) {
    return writeFailure(error);
  }
}

/**
 * Archives a patient. Archiving an already archived patient is idempotent, so
 * a retried delete does not report a failure for work that is already done.
 */
export async function deletePatient(
  patientId: string
): Promise<ActionResult<PatientArchiveResult>> {
  const actor = await authorize(PERMISSIONS.PATIENTS_ARCHIVE);
  if (!actor.ok) return actor;

  try {
    const patient = await getPrisma().patient.findFirst({
      where: { id: patientId },
      select: { id: true, deletedAt: true },
    });

    if (!patient) return knownFailure(PATIENT_NOT_FOUND);

    if (patient.deletedAt) {
      return actionSuccess({
        id: patient.id,
        archivedAt: patient.deletedAt.toISOString(),
      });
    }

    const archivedAt = new Date();
    await getPrisma().patient.update({
      where: { id: patient.id },
      data: { deletedAt: archivedAt },
    });

    return actionSuccess({ id: patient.id, archivedAt: archivedAt.toISOString() });
  } catch (error) {
    return writeFailure(error);
  }
}

/**
 * Reverses an archive: the patient returns to the panel, the list, and search.
 *
 * The archive is a record keeping, not a state a patient can be trapped in, so
 * restoring is a command of its own rather than an absence of a delete. It is
 * idempotent — a patient who is already active is not a failure, it is the
 * outcome the caller wanted — and it restores the patient alone: an archived
 * visit stays archived until it is restored in turn, so an archive is unwound
 * from the top down rather than all at once.
 *
 * Restoring does not have to check that the patient's email or code are free.
 * Archiving never released them, so nothing else can have taken them in the
 * meantime; the uniqueness they were archived under still holds.
 *
 * Only an administrator restores, because an archive is how the clinic takes a
 * mistake or a record it must not keep out of the way; a role that may archive a
 * patient is not thereby trusted to bring one back.
 */
export async function restorePatient(
  patientId: string
): Promise<ActionResult<PatientRestoreResult>> {
  const actor = await authorize(PERMISSIONS.PATIENTS_RESTORE);
  if (!actor.ok) return actor;

  try {
    // The lookup ignores `deletedAt` on purpose: an archived patient is precisely
    // the row this command is here to find.
    const patient = await getPrisma().patient.findFirst({
      where: { id: patientId },
      select: { id: true, deletedAt: true },
    });

    if (!patient) return knownFailure(PATIENT_NOT_FOUND);

    if (!patient.deletedAt) {
      return actionSuccess({ id: patient.id, restoredAt: null });
    }

    const restoredAt = new Date();
    await getPrisma().patient.update({
      where: { id: patient.id },
      data: { deletedAt: null },
    });

    return actionSuccess({
      id: patient.id,
      restoredAt: restoredAt.toISOString(),
    });
  } catch (error) {
    return writeFailure(error);
  }
}

/** Archived patients keep their email, so an identity is never reused. */
async function emailIsTaken(email: string, exceptPatientId?: string) {
  const owner = await getPrisma().patient.findFirst({
    where: { email },
    select: { id: true },
  });

  return owner != null && owner.id !== exceptPatientId;
}

function writeFailure(error: unknown): ActionFailureResult {
  if (clashedUniqueField(error) === "email") {
    return knownFailure(PATIENT_EMAIL_TAKEN);
  }

  console.error("Patient write failed:", error);

  return internalFailure();
}

/**
 * Which unique index rejected the write. A clash on the patient code is not an
 * email conflict, so it must not borrow the email's message.
 */
function clashedUniqueField(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;

  const { code, meta } = error as { code?: unknown; meta?: unknown };

  if (code !== "P2002" || typeof meta !== "object" || meta === null) {
    return null;
  }

  const { target } = meta as { target?: unknown };

  if (Array.isArray(target) && target.length === 1) {
    return typeof target[0] === "string" ? target[0] : null;
  }

  return typeof target === "string" ? target : null;
}
