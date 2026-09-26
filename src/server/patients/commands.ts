import prisma from "@/lib/prisma";
import {
  actionSuccess,
  internalFailure,
  knownFailure,
  type ActionFailureResult,
  type ActionResult,
} from "@/lib/action-result";
import { getSession, unauthenticatedFailure } from "@/lib/session";
import { PATIENT_EMAIL_TAKEN, PATIENT_NOT_FOUND } from "./contract";

/**
 * Patient write commands. Each one requires a session, validates through the
 * caller-supplied input, and answers with a stable result instead of throwing.
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

export async function createPatient(
  input: PatientInput
): Promise<ActionResult<PatientWriteResult>> {
  const session = await getSession();
  if (!session) return unauthenticatedFailure();

  if (await emailIsTaken(input.email)) return knownFailure(PATIENT_EMAIL_TAKEN);

  try {
    const created = await prisma.patient.create({ data: input });

    return actionSuccess({ id: created.id });
  } catch (error) {
    return writeFailure(error);
  }
}

export async function updatePatient(
  patientId: string,
  input: PatientInput
): Promise<ActionResult<PatientWriteResult>> {
  const session = await getSession();
  if (!session) return unauthenticatedFailure();

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, deletedAt: null },
  });

  if (!patient) return knownFailure(PATIENT_NOT_FOUND);

  if (await emailIsTaken(input.email, patient.id))
    return knownFailure(PATIENT_EMAIL_TAKEN);

  try {
    const updated = await prisma.patient.update({
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
  const session = await getSession();
  if (!session) return unauthenticatedFailure();

  try {
    const patient = await prisma.patient.findFirst({
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
    await prisma.patient.update({
      where: { id: patient.id },
      data: { deletedAt: archivedAt },
    });

    return actionSuccess({ id: patient.id, archivedAt: archivedAt.toISOString() });
  } catch (error) {
    return writeFailure(error);
  }
}

/** Archived patients keep their email, so an identity is never reused. */
async function emailIsTaken(email: string, exceptPatientId?: string) {
  const owner = await prisma.patient.findFirst({
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
