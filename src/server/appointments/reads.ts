import { getPrisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/server/access";
import type { ArchiveListQuery } from "@/server/archive/contract";
import type { ArchivePage } from "@/server/archive/dto";
import {
  ARCHIVED_RECORD,
  MOST_RECENTLY_ARCHIVED,
  pageOf,
} from "@/server/archive/reads";
import {
  CHRONOLOGICAL,
  toArchiveEvent,
  type ArchiveEventDto,
} from "@/server/archive-events/dto";
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  type AppointmentListQuery,
  type AppointmentWindow,
} from "./contract";
import {
  toArchivedAppointment,
  toAppointmentDetail,
  toAppointmentSummary,
  type ArchivedAppointmentDto,
  type AppointmentDetailDto,
  type AppointmentSummaryDto,
  type AppointmentWithRelations,
} from "./dto";

/**
 * Appointment reads for staff screens. Every read requires a session, and every
 * read hides archived records: an appointment is history once archived, and an
 * appointment whose patient is archived is inactive rather than active, so it
 * leaves the normal clinical screens too.
 *
 * The archive is the one exception, and it asks for `appointments:archive` instead:
 * reading the history is not reading the appointment.
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
  await requirePermission(PERMISSIONS.APPOINTMENTS_READ);

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
 * One page of archived appointments, most recently archived first.
 *
 * Only `deletedAt` is asked about, where the active list also insists on an active
 * patient. That is the difference between the two lists: an appointment whose
 * patient is archived is invisible on the calendar, and this is where a reader goes
 * to find it.
 */
export async function listArchivedAppointments(
  query: ArchiveListQuery = {},
): Promise<ArchivePage<ArchivedAppointmentDto>> {
  await requirePermission(PERMISSIONS.APPOINTMENTS_ARCHIVE);

  const { page, pageSize, skip, take } = pageOf(query);

  const [appointments, totalCount] = await Promise.all([
    getPrisma().appointment.findMany({
      where: ARCHIVED_RECORD,
      include: { patient: true },
      orderBy: MOST_RECENTLY_ARCHIVED,
      skip,
      take,
    }),
    getPrisma().appointment.count({ where: ARCHIVED_RECORD }),
  ]);

  return {
    rows: appointments.map(toArchivedAppointment),
    page,
    pageSize,
    totalCount,
  };
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
  await requirePermission(PERMISSIONS.APPOINTMENTS_READ);

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
  await requirePermission(PERMISSIONS.APPOINTMENTS_READ);

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

/**
 * The archive and restore events for one appointment, oldest first.
 *
 * The log answers the question a nullable `deletedAt` cannot: what happened to
 * this record over its life. An appointment archived and later restored has two
 * events here rather than one column that is null again. An archived appointment
 * is history, so this read is not filtered by `deletedAt` the way the clinical
 * reads are.
 */
export async function listAppointmentHistory(
  appointmentId: string,
): Promise<ArchiveEventDto[]> {
  await requirePermission(PERMISSIONS.APPOINTMENTS_READ);

  const events = await getPrisma().archiveRestoreEvent.findMany({
    where: { recordType: "Appointment", recordId: appointmentId },
    orderBy: CHRONOLOGICAL,
  });

  return events.map(toArchiveEvent);
}
