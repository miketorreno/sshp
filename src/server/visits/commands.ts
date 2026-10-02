import { getPrisma } from "@/lib/prisma";
import {
  actionSuccess,
  internalFailure,
  knownFailure,
  type ActionFailureResult,
  type ActionResult,
} from "@/lib/action-result";
import { appendArchiveEvent } from "@/server/archive-events/log";
import { PERMISSIONS, authorize } from "@/server/access";
import type { VisitType } from "@/generated/prisma";
import {
  VISIT_ALREADY_CHECKED_OUT,
  VISIT_CHECKED_OUT,
  VISIT_NOT_FOUND,
  VISIT_PATIENT_NOT_FOUND,
} from "./contract";

/**
 * Visit write commands. Each one requires a session holding the permission its
 * change needs, addresses the visit the path names rather than an id in the body,
 * verifies that visit is still an active one for an active patient, and answers
 * with a stable result instead of throwing.
 *
 * A checked-out visit is history. It still reads, and it no longer accepts a
 * clinical write or an archive, so a mistake made after checkout is corrected in
 * the record, not by rewriting the past.
 *
 * Archiving a visit keeps the row for history and stops normal reads from
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

/**
 * `restoredAt` is null when the visit was already active, so a retried restore
 * reports that there was no archive left to reverse.
 */
export type VisitRestoreResult = { id: string; restoredAt: string | null };

const ACTIVE_VISIT = {
  deletedAt: null,
  patient: { deletedAt: null },
} as const;

export async function createVisit(
  input: VisitInput,
): Promise<ActionResult<VisitWriteResult>> {
  const actor = await authorize(PERMISSIONS.VISITS_WRITE);
  if (!actor.ok) return actor;

  if (!(await isActivePatient(input.patientId)))
    return knownFailure(VISIT_PATIENT_NOT_FOUND);

  try {
    const created = await getPrisma().visit.create({
      data: {
        patientId: input.patientId,
        providerId: actor.data.user.id,
        createdById: actor.data.user.id,
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
  const actor = await authorize(PERMISSIONS.VISITS_WRITE);
  if (!actor.ok) return actor;

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
        updatedById: actor.data.user.id,
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
  const actor = await authorize(PERMISSIONS.VISITS_WRITE);
  if (!actor.ok) return actor;

  const visit = await findActiveVisit(visitId);

  if (!visit) return knownFailure(VISIT_NOT_FOUND);
  if (visit.endDateTime) return knownFailure(VISIT_ALREADY_CHECKED_OUT);

  try {
    const checkedOut = await getPrisma().visit.update({
      where: { id: visit.id },
      data: { endDateTime: new Date(), updatedById: actor.data.user.id },
    });

    return actionSuccess({ id: checkedOut.id });
  } catch (error) {
    return writeFailure(error);
  }
}

/**
 * Archives a visit. Archiving an already archived visit is idempotent, so a
 * retried archive does not report a failure for work that is already done.
 */
export async function archiveVisit(
  visitId: string,
): Promise<ActionResult<VisitArchiveResult>> {
  const actor = await authorize(PERMISSIONS.VISITS_ARCHIVE);
  if (!actor.ok) return actor;

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
    await getPrisma().$transaction(async (tx) => {
      await tx.visit.update({
        where: { id: visit.id },
        data: { deletedAt: archivedAt, updatedById: actor.data.user.id },
      });
      await appendArchiveEvent(tx, {
        action: "ARCHIVE",
        recordType: "Visit",
        recordId: visit.id,
        actorId: actor.data.user.id,
        occurredAt: archivedAt,
      });
    });

    return actionSuccess({
      id: visit.id,
      archivedAt: archivedAt.toISOString(),
    });
  } catch (error) {
    return writeFailure(error);
  }
}

/**
 * Reverses an archive: the visit returns to the day's list and to its detail page.
 *
 * Idempotent, like archiving is. It restores the visit alone, and it is the only
 * restore that insists on its surroundings: a visit under an archived patient is
 * not restorable, because a restored visit whose patient is still out of the way
 * would read as a half record. The archive is therefore unwound from the top down —
 * patient, then visit, then the vitals and orders inside it — and each step
 * reports the same NOT_FOUND the archive reported when the row was not there.
 *
 * Restoring does not undo a checkout. The end of a visit is a fact recorded once,
 * so a restored visit reads as the closed visit it was.
 *
 * Only an administrator restores; see ADR 0005.
 */
export async function restoreVisit(
  visitId: string
): Promise<ActionResult<VisitRestoreResult>> {
  const actor = await authorize(PERMISSIONS.VISITS_RESTORE);
  if (!actor.ok) return actor;

  try {
    // The lookup ignores `deletedAt` on purpose: an archived visit is precisely
    // the row this command is here to find.
    const visit = await getPrisma().visit.findFirst({
      where: { id: visitId, patient: { deletedAt: null } },
      select: { id: true, deletedAt: true },
    });

    // A visit under an archived patient is reported as not found rather than
    // restored: a restored visit whose patient is still out of the way would read
    // as a half record, so the archive unwinds from the top down.
    if (!visit) return knownFailure(VISIT_NOT_FOUND);

    if (!visit.deletedAt) {
      return actionSuccess({ id: visit.id, restoredAt: null });
    }

    const restoredAt = new Date();
    await getPrisma().$transaction(async (tx) => {
      await tx.visit.update({
        where: { id: visit.id },
        data: { deletedAt: null, updatedById: actor.data.user.id },
      });
      await appendArchiveEvent(tx, {
        action: "RESTORE",
        recordType: "Visit",
        recordId: visit.id,
        actorId: actor.data.user.id,
        occurredAt: restoredAt,
      });
    });

    return actionSuccess({ id: visit.id, restoredAt: restoredAt.toISOString() });
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
