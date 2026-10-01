import { getPrisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  type AppointmentListQuery,
  type AppointmentWindow,
} from "./contract";
import {
  toAppointmentDetail,
  toAppointmentSummary,
  type AppointmentDetailDto,
  type AppointmentSummaryDto,
  type AppointmentWithRelations,
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
  query: AppointmentListQuery = {},
): Promise<AppointmentSummaryDto[]> {
  await requireSession();

  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const limit = clamp(query.limit);

  const appointments = await getPrisma().appointment.findMany({
    // The search narrows the active list; it never replaces the active rule, so
    // searching cannot surface an appointment of an archived patient.
    where: {
      ...ACTIVE_APPOINTMENT,
      ...searchedPatient(query.search),
    },
    include: APPOINTMENT_RELATIONS,
    orderBy: { startDateTime: "asc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return toSummaries(appointments);
}

/**
 * How a search term finds a patient, or nothing when no term was typed.
 *
 * Any part of the name counts, and so does the patient code, because reception
 * reads appointments by code as often as by name. A blank term is not a filter,
 * so an untouched box lists every active appointment rather than none.
 */
function searchedPatient(term: string | undefined) {
  const searched = term?.trim();

  if (!searched) return null;

  const contains = { contains: searched, mode: "insensitive" } as const;

  return {
    patient: {
      AND: [
        { deletedAt: null },
        {
          OR: [
            { firstName: contains },
            { middleName: contains },
            { lastName: contains },
            { patientCode: contains },
          ],
        },
      ],
    },
  };
}

/**
 * The appointments starting inside a window, which is how the calendar reads.
 *
 * A window is not a page. The calendar draws whatever days the reader navigated
 * to, so a month is a month: reading a page of the list for it would draw a
 * month with a silent hole wherever the page ended, and reading the whole clinic
 * would grow without bound. The window is half-open — `from` is included, `to`
 * is the first moment past it — so consecutive windows neither drop an
 * appointment that starts exactly on the boundary nor draw one twice.
 *
 * A window is still a bounded ask: the caller names its ends, and the read
 * answers exactly what falls between them rather than deciding a size.
 */
export async function listAppointmentsInWindow(
  window: AppointmentWindow,
): Promise<AppointmentSummaryDto[]> {
  await requireSession();

  const appointments = await getPrisma().appointment.findMany({
    where: {
      ...ACTIVE_APPOINTMENT,
      // Overlap, not "starts inside": an appointment that began before the window
      // and runs into it is drawn on the day the clinician is looking at, so it
      // has to be in the answer. Matching only `startDateTime` would leave a
      // multi-day or late-running appointment invisible for exactly as long as it
      // overlapped the screen.
      OR: [
        {
          AND: [
            { startDateTime: { lt: window.to } },
            { endDateTime: { gt: window.from } },
          ],
        },
      ],
    },
    include: APPOINTMENT_RELATIONS,
    orderBy: { startDateTime: "asc" },
  });

  return toSummaries(appointments);
}

async function toSummaries(
  appointments: AppointmentWithRelations[],
): Promise<AppointmentSummaryDto[]> {
  const checkedIn = await checkedInAppointmentIds(
    appointments.map((appointment) => appointment.id),
  );

  return appointments.map((appointment) =>
    toAppointmentSummary(appointment, checkedIn.has(appointment.id)),
  );
}

/** Reads an active appointment, or null when it is missing or inactive. */
export async function getAppointmentDetail(
  id: string,
): Promise<AppointmentDetailDto | null> {
  await requireSession();

  const appointment = await getPrisma().appointment.findFirst({
    where: { id, ...ACTIVE_APPOINTMENT },
    include: APPOINTMENT_RELATIONS,
  });

  if (!appointment) return null;

  return toAppointmentDetail(appointment, await isCheckedIn(appointment.id));
}

/**
 * A check-in links a visit to the appointment, and the visit is what holds that
 * link, so the visits answer whether these appointments are already checked in.
 * An archived visit still counts: archiving a visit retires it from clinical
 * reads, it does not un-check-in the appointment that opened it.
 */
async function checkedInAppointmentIds(
  appointmentIds: string[],
): Promise<Set<string>> {
  if (appointmentIds.length === 0) return new Set();

  const visits = await getPrisma().visit.findMany({
    where: { appointmentId: { in: appointmentIds } },
    select: { appointmentId: true },
  });

  return new Set(
    visits.flatMap((visit) =>
      visit.appointmentId ? [visit.appointmentId] : [],
    ),
  );
}

async function isCheckedIn(appointmentId: string): Promise<boolean> {
  const visit = await getPrisma().visit.findFirst({
    where: { appointmentId },
    select: { id: true },
  });

  return visit != null;
}

function clamp(limit: number | undefined): number {
  if (limit === undefined || Number.isNaN(limit)) return DEFAULT_LIST_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIST_LIMIT);
}
