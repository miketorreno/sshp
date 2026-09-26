import prisma from "@/lib/prisma";
import {
  actionSuccess,
  internalFailure,
  knownFailure,
  type ActionFailureResult,
  type ActionResult,
} from "@/lib/action-result";
import { getSession, unauthenticatedFailure } from "@/lib/session";
import { VITALS_NOT_FOUND, VITALS_VISIT_NOT_FOUND } from "./vitals-contract";
import { VISIT_CHECKED_OUT } from "./contract";

/**
 * Vitals write commands. Each command verifies the visit the path names is the
 * owner of the vitals record, that the visit is still active for an active
 * patient, that checkout has not closed the visit to clinical changes, and
 * populates the actor who recorded or removed them.
 *
 * Numeric zero values are meaningful, so validation must not drop them.
 * Archiving vitals retains the row rather than destroying it, and archiving an
 * already archived record is idempotent.
 */

export type VitalsInput = {
  visitId: string;
  recordedAt: Date;
  height: number | null;
  weight: number | null;
  systolicBP: number | null;
  diastolicBP: number | null;
  heartRate: number | null;
  temperatureCelsius: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  glucose: number | null;
  cholesterol: number | null;
};

export type VitalsWriteResult = { id: string };

export type VitalsArchiveResult = { id: string; archivedAt: string };

const ACTIVE_VISIT = {
  deletedAt: null,
  patient: { deletedAt: null },
} as const;

export async function recordVitals(
  input: VitalsInput,
): Promise<ActionResult<VitalsWriteResult>> {
  const session = await getSession();
  if (!session) return unauthenticatedFailure();

  const visit = await findActiveVisit(input.visitId);

  if (!visit) return knownFailure(VITALS_VISIT_NOT_FOUND);
  if (visit.endDateTime) return knownFailure(VISIT_CHECKED_OUT);

  try {
    const created = await prisma.vitals.create({
      data: {
        visitId: input.visitId,
        recordedById: session.user.id,
        recordedAt: input.recordedAt,
        height: input.height,
        weight: input.weight,
        systolicBP: input.systolicBP,
        diastolicBP: input.diastolicBP,
        heartRate: input.heartRate,
        temperatureCelsius: input.temperatureCelsius,
        respiratoryRate: input.respiratoryRate,
        oxygenSaturation: input.oxygenSaturation,
        glucose: input.glucose,
        cholesterol: input.cholesterol,
      },
    });

    return actionSuccess({ id: created.id });
  } catch (error) {
    return writeFailure(error);
  }
}

export async function deleteVitals(
  visitId: string,
  vitalsId: string,
): Promise<ActionResult<VitalsArchiveResult>> {
  const session = await getSession();
  if (!session) return unauthenticatedFailure();

  const visit = await findActiveVisit(visitId);

  if (!visit) return knownFailure(VITALS_VISIT_NOT_FOUND);

  try {
    // The visit in the path owns the lookup, so vitals recorded during another
    // visit are not reachable through this one.
    const vitals = await prisma.vitals.findFirst({
      where: { id: vitalsId, visitId },
      select: { id: true, deletedAt: true },
    });

    if (!vitals) return knownFailure(VITALS_NOT_FOUND);

    // Checkout closes the visit to clinical writes before idempotence is
    // considered: once the visit is closed, no archival of it or its children is
    // accepted, not even one that would change nothing.
    if (visit.endDateTime) return knownFailure(VISIT_CHECKED_OUT);

    if (vitals.deletedAt) {
      return actionSuccess({
        id: vitals.id,
        archivedAt: vitals.deletedAt.toISOString(),
      });
    }

    const archivedAt = new Date();
    await prisma.vitals.update({
      where: { id: vitals.id },
      data: { deletedAt: archivedAt },
    });

    return actionSuccess({
      id: vitals.id,
      archivedAt: archivedAt.toISOString(),
    });
  } catch (error) {
    return writeFailure(error);
  }
}

async function findActiveVisit(visitId: string) {
  return prisma.visit.findFirst({
    where: { id: visitId, ...ACTIVE_VISIT },
    select: { id: true, endDateTime: true },
  });
}

function writeFailure(error: unknown): ActionFailureResult {
  console.error("Vitals write failed:", error);

  return internalFailure();
}
