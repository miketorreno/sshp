import { getPrisma } from "@/lib/prisma";
import {
  actionSuccess,
  internalFailure,
  knownFailure,
  type ActionFailureResult,
  type ActionResult,
} from "@/lib/action-result";
import { getSession, unauthenticatedFailure } from "@/lib/session";
import type { AppointmentType, AppointmentStatus, VisitType } from "@/generated/prisma";
import {
  APPOINTMENT_ALREADY_CHECKED_IN,
  APPOINTMENT_NOT_FOUND,
  APPOINTMENT_PATIENT_NOT_FOUND,
} from "./contract";

/**
 * Appointment write commands. Each one requires a session, verifies the
 * appointment it addresses is an active one for an active patient, and answers
 * with a stable result instead of throwing.
 *
 * Deleting an appointment archives it: the row stays for history and normal reads
 * stop returning it.
 */

export type AppointmentInput = {
  patientId: string;
  startDateTime: Date;
  endDateTime: Date;
  appointmentType: AppointmentType;
  appointmentStatus: AppointmentStatus;
  reason: string | null;
};

/** An edit reschedules or reclassifies an appointment; it never re-assigns it. */
export type AppointmentEdit = Omit<AppointmentInput, "patientId">;

export type AppointmentWriteResult = { id: string };

export type AppointmentArchiveResult = { id: string; archivedAt: string };

export type CheckInResult = { appointmentId: string; visitId: string };

const ACTIVE_APPOINTMENT = {
  deletedAt: null,
  patient: { deletedAt: null },
} as const;

export async function createAppointment(
  input: AppointmentInput
): Promise<ActionResult<AppointmentWriteResult>> {
  const session = await getSession();
  if (!session) return unauthenticatedFailure();

  if (!(await isActivePatient(input.patientId)))
    return knownFailure(APPOINTMENT_PATIENT_NOT_FOUND);

  try {
    const created = await getPrisma().appointment.create({
      data: {
        patientId: input.patientId,
        providerId: session.user.id,
        startDateTime: input.startDateTime,
        endDateTime: input.endDateTime,
        appointmentType: input.appointmentType,
        appointmentStatus: input.appointmentStatus,
        reason: input.reason,
      },
    });

    return actionSuccess({ id: created.id });
  } catch (error) {
    return writeFailure(error);
  }
}

export async function updateAppointment(
  appointmentId: string,
  input: AppointmentEdit
): Promise<ActionResult<AppointmentWriteResult>> {
  const session = await getSession();
  if (!session) return unauthenticatedFailure();

  const appointment = await findActiveAppointment(appointmentId);

  if (!appointment) return knownFailure(APPOINTMENT_NOT_FOUND);

  try {
    const updated = await getPrisma().appointment.update({
      where: { id: appointment.id },
      data: {
        startDateTime: input.startDateTime,
        endDateTime: input.endDateTime,
        appointmentType: input.appointmentType,
        appointmentStatus: input.appointmentStatus,
        reason: input.reason,
      },
    });

    return actionSuccess({ id: updated.id });
  } catch (error) {
    return writeFailure(error);
  }
}

/**
 * Archives an appointment. Archiving an already archived appointment is
 * idempotent, so a retried delete does not report a failure for work that is
 * already done.
 */
export async function deleteAppointment(
  appointmentId: string
): Promise<ActionResult<AppointmentArchiveResult>> {
  const session = await getSession();
  if (!session) return unauthenticatedFailure();

  try {
    const appointment = await getPrisma().appointment.findFirst({
      where: { id: appointmentId },
      select: { id: true, deletedAt: true },
    });

    if (!appointment) return knownFailure(APPOINTMENT_NOT_FOUND);

    if (appointment.deletedAt) {
      return actionSuccess({
        id: appointment.id,
        archivedAt: appointment.deletedAt.toISOString(),
      });
    }

    const archivedAt = new Date();
    await getPrisma().appointment.update({
      where: { id: appointment.id },
      data: { deletedAt: archivedAt },
    });

    return actionSuccess({
      id: appointment.id,
      archivedAt: archivedAt.toISOString(),
    });
  } catch (error) {
    return writeFailure(error);
  }
}

/**
 * Checks a patient in from an appointment. The visit and the appointment's
 * attended status are one change: either the visit exists and the appointment
 * reads as attended, or neither happened. An appointment is checked in once, so a
 * second attempt reports the conflict instead of opening a second visit.
 *
 * The link lives on the visit: `Visit.appointmentId` is what the check-in writes,
 * so it is also what decides whether an appointment is already checked in.
 * Checking in is a fact that archiving does not undo: an appointment whose visit
 * was archived is still checked in, and the unique index on
 * `Visit.appointmentId` means it cannot be checked in again.
 */
export async function checkInAppointment(
  appointmentId: string
): Promise<ActionResult<CheckInResult>> {
  const session = await getSession();
  if (!session) return unauthenticatedFailure();

  try {
    const appointment = await getPrisma().appointment.findFirst({
      where: { id: appointmentId, ...ACTIVE_APPOINTMENT },
      select: {
        id: true,
        patientId: true,
        providerId: true,
        startDateTime: true,
        appointmentType: true,
        reason: true,
      },
    });

    if (!appointment) return knownFailure(APPOINTMENT_NOT_FOUND);

    const alreadyCheckedIn = await getPrisma().visit.findFirst({
      where: { appointmentId: appointment.id },
      select: { id: true },
    });

    if (alreadyCheckedIn) return knownFailure(APPOINTMENT_ALREADY_CHECKED_IN);

    const visit = await getPrisma().$transaction(async (tx) => {
      const opened = await tx.visit.create({
        data: {
          patientId: appointment.patientId,
          providerId: appointment.providerId ?? session.user.id,
          createdById: session.user.id,
          appointmentId: appointment.id,
          visitType: visitTypeFor(appointment.appointmentType),
          startDateTime: appointment.startDateTime,
          reason: appointment.reason,
        },
      });

      await tx.appointment.update({
        where: { id: appointment.id },
        data: { appointmentStatus: "ATTENDED" },
      });

      return opened;
    });

    return actionSuccess({ appointmentId: appointment.id, visitId: visit.id });
  } catch (error) {
    return writeFailure(error);
  }
}

/** The active appointment the path addressed, or null when it is not usable. */
async function findActiveAppointment(appointmentId: string) {
  return getPrisma().appointment.findFirst({
    where: { id: appointmentId, ...ACTIVE_APPOINTMENT },
    select: { id: true, patientId: true, startDateTime: true },
  });
}

async function isActivePatient(patientId: string): Promise<boolean> {
  const patient = await getPrisma().patient.findFirst({
    where: { id: patientId, deletedAt: null },
    select: { id: true },
  });

  return patient != null;
}

/**
 * The schema calls an appointment for an inpatient admission an admission, and
 * the visit table has no inpatient type yet, so it opens as a clinic visit.
 */
function visitTypeFor(type: AppointmentType): VisitType {
  return type === "ADMISSION" ? "CLINIC" : type;
}

function writeFailure(error: unknown): ActionFailureResult {
  console.error("Appointment write failed:", error);

  return internalFailure();
}
