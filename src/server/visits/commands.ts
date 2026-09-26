import { getPrisma } from "@/lib/prisma";
import {
  actionSuccess,
  internalFailure,
  knownFailure,
  type ActionFailureResult,
  type ActionResult,
} from "@/lib/action-result";
import { getSession, unauthenticatedFailure } from "@/lib/session";
import type { VisitType } from "@/generated/prisma";
import {
  VISIT_ALREADY_CHECKED_OUT,
  VISIT_CHECKED_OUT,
  VISIT_NOT_FOUND,
  VISIT_PATIENT_NOT_FOUND,
} from "./contract";

/**
 * Visit write commands. Each one requires a session, addresses the visit the path
 * names rather than an id in the body, verifies that visit is still an active one
 * for an active patient, and answers with a stable result instead of throwing.
 *
 * A checked-out visit is history. It still reads, and it no longer accepts a
 * clinical write or an archive, so a mistake made after checkout is corrected in
 * the record, not by rewriting the past.
 *
 * Deleting a visit archives it: the row stays for history and normal reads stop
 * returning it.
 */

export type VisitInput = {
  patientId: string;
  visitType: VisitType;
  startDateTime: Date;
  reason: string | null;
};

/** An edit changes how a visit reads; it never moves it to another patient. */
export type VisitEdit = Omit<VisitInput, "patientId">;

export type VisitWriteResult = { id: string };

export type VisitArchiveResult = { id: string; archivedAt: string };

const ACTIVE_VISIT = {
  deletedAt: null,
  patient: { deletedAt: null },
} as const;

export async function createVisit(
  input: VisitInput,
): Promise<ActionResult<VisitWriteResult>> {
  const session = await getSession();
  if (!session) return unauthenticatedFailure();

  if (!(await isActivePatient(input.patientId)))
    return knownFailure(VISIT_PATIENT_NOT_FOUND);

  try {
    const created = await getPrisma().visit.create({
      data: {
        patientId: input.patientId,
        providerId: session.user.id,
        createdById: session.user.id,
        visitType: input.visitType,
        startDateTime: input.startDateTime,
        reason: input.reason,
      },
    });

    return actionSuccess({ id: created.id });
  } catch (error) {
    return writeFailure(error);
  }
}

export async function updateVisit(
  visitId: string,
  input: VisitEdit,
): Promise<ActionResult<VisitWriteResult>> {
  const session = await getSession();
  if (!session) return unauthenticatedFailure();

  const visit = await findActiveVisit(visitId);

  if (!visit) return knownFailure(VISIT_NOT_FOUND);
  if (visit.endDateTime) return knownFailure(VISIT_CHECKED_OUT);

  try {
    const updated = await getPrisma().visit.update({
      where: { id: visit.id },
      data: {
        visitType: input.visitType,
        startDateTime: input.startDateTime,
        reason: input.reason,
        updatedById: session.user.id,
      },
    });

    return actionSuccess({ id: updated.id });
  } catch (error) {
    return writeFailure(error);
  }
}

/**
 * Ends a visit now. The end of a visit is a fact recorded once, so a second
 * checkout reports the conflict instead of moving the end of the visit.
 */
export async function checkoutVisit(
  visitId: string,
): Promise<ActionResult<VisitWriteResult>> {
  const session = await getSession();
  if (!session) return unauthenticatedFailure();

  const visit = await findActiveVisit(visitId);

  if (!visit) return knownFailure(VISIT_NOT_FOUND);
  if (visit.endDateTime) return knownFailure(VISIT_ALREADY_CHECKED_OUT);

  try {
    const checkedOut = await getPrisma().visit.update({
      where: { id: visit.id },
      data: { endDateTime: new Date(), updatedById: session.user.id },
    });

    return actionSuccess({ id: checkedOut.id });
  } catch (error) {
    return writeFailure(error);
  }
}

/**
 * Archives a visit. Archiving an already archived visit is idempotent, so a
 * retried delete does not report a failure for work that is already done.
 */
export async function deleteVisit(
  visitId: string,
): Promise<ActionResult<VisitArchiveResult>> {
  const session = await getSession();
  if (!session) return unauthenticatedFailure();

  try {
    const visit = await getPrisma().visit.findFirst({
      where: { id: visitId, patient: { deletedAt: null } },
      select: { id: true, deletedAt: true, endDateTime: true },
    });

    if (!visit) return knownFailure(VISIT_NOT_FOUND);

    // Checkout closes the visit to clinical writes before idempotence is
    // considered: once the visit is closed, no archival of it or its children is
    // accepted, not even one that would change nothing.
    if (visit.endDateTime) return knownFailure(VISIT_CHECKED_OUT);

    if (visit.deletedAt) {
      return actionSuccess({
        id: visit.id,
        archivedAt: visit.deletedAt.toISOString(),
      });
    }

    const archivedAt = new Date();
    await getPrisma().visit.update({
      where: { id: visit.id },
      data: { deletedAt: archivedAt, updatedById: session.user.id },
    });

    return actionSuccess({
      id: visit.id,
      archivedAt: archivedAt.toISOString(),
    });
  } catch (error) {
    return writeFailure(error);
  }
}

/** The active visit the path addressed, or null when it is not one. */
async function findActiveVisit(visitId: string) {
  return getPrisma().visit.findFirst({
    where: { id: visitId, ...ACTIVE_VISIT },
    select: { id: true, endDateTime: true },
  });
}

async function isActivePatient(patientId: string): Promise<boolean> {
  const patient = await getPrisma().patient.findFirst({
    where: { id: patientId, deletedAt: null },
    select: { id: true },
  });

  return patient != null;
}

function writeFailure(error: unknown): ActionFailureResult {
  console.error("Visit write failed:", error);

  return internalFailure();
}
