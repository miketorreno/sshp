import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  type AppointmentListQuery,
} from "./contract";
import {
  toAppointmentDetail,
  toAppointmentSummary,
  type AppointmentDetailDto,
  type AppointmentSummaryDto,
} from "./dto";

/**
 * Appointment reads for staff screens. Every read requires a session, and every
 * read hides archived records: an appointment is history once archived, and an
 * appointment whose patient is archived is inactive rather than active, so it
 * leaves the normal clinical screens too.
 */

const ACTIVE_APPOINTMENT = {
  deletedAt: null,
  patient: { deletedAt: null },
} as const;

const APPOINTMENT_RELATIONS = {
  patient: true,
  provider: true,
} as const;

export async function listAppointments(
  query: AppointmentListQuery = {}
): Promise<AppointmentSummaryDto[]> {
  await requireSession();

  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const limit = clamp(query.limit);

  const appointments = await prisma.appointment.findMany({
    where: ACTIVE_APPOINTMENT,
    include: APPOINTMENT_RELATIONS,
    orderBy: { startDateTime: "asc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const checkedIn = await checkedInAppointmentIds(
    appointments.map((appointment) => appointment.id)
  );

  return appointments.map((appointment) =>
    toAppointmentSummary(appointment, checkedIn.has(appointment.id))
  );
}

/** Reads an active appointment, or null when it is missing or inactive. */
export async function getAppointmentDetail(
  id: string
): Promise<AppointmentDetailDto | null> {
  await requireSession();

  const appointment = await prisma.appointment.findFirst({
    where: { id, ...ACTIVE_APPOINTMENT },
    include: APPOINTMENT_RELATIONS,
  });

  if (!appointment) return null;

  return toAppointmentDetail(
    appointment,
    await isCheckedIn(appointment.id)
  );
}

/**
 * A check-in links a visit to the appointment, and the visit is what holds that
 * link, so the visits answer whether these appointments are already checked in.
 * An archived visit still counts: archiving a visit retires it from clinical
 * reads, it does not un-check-in the appointment that opened it.
 */
async function checkedInAppointmentIds(
  appointmentIds: string[]
): Promise<Set<string>> {
  if (appointmentIds.length === 0) return new Set();

  const visits = await prisma.visit.findMany({
    where: { appointmentId: { in: appointmentIds } },
    select: { appointmentId: true },
  });

  return new Set(
    visits.flatMap((visit) => (visit.appointmentId ? [visit.appointmentId] : []))
  );
}

async function isCheckedIn(appointmentId: string): Promise<boolean> {
  const visit = await prisma.visit.findFirst({
    where: { appointmentId },
    select: { id: true },
  });

  return visit != null;
}

function clamp(limit: number | undefined): number {
  if (limit === undefined || Number.isNaN(limit)) return DEFAULT_LIST_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIST_LIMIT);
}
