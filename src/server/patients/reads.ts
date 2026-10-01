import { getPrisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/server/access";
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  type PatientListQuery,
} from "./contract";
import {
  toAdmittedPatient,
  toPatientDetail,
  toPatientSummary,
  type AdmittedPatientDto,
  type PatientDetailDto,
  type PatientListDto,
} from "./dto";

/**
 * Patient reads for staff screens. Every read requires a session that holds
 * `patients:read`, and every read hides archived patients: an archived record is
 * history, not something normal clinical screens show.
 */

const ACTIVE_PATIENT = { deletedAt: null } as const;

/**
 * Newest first, with the id as the tiebreaker.
 *
 * Patients registered in the same transaction share a `createdAt`, and a list
 * sorted only by it would leave those rows in whatever order the database
 * returned them. Page two of such a list could then repeat a row from page one
 * and silently drop another, which is why the id — which is never equal across
 * rows — settles every tie.
 */
const NEWEST_FIRST = { createdAt: "desc", id: "desc" } as const;

/**
 * One page of active patients, narrowed by an optional search term.
 *
 * The read reports the page it served *and* how many patients matched in total,
 * because a pager that only knows the size of its own page has to guess whether
 * a next page exists — and it guesses wrong on the last page whenever the count
 * is an exact multiple of the page size. Counting here makes that a fact rather
 * than an inference, at the cost of a second query on every read.
 *
 * A search narrows the active list rather than replacing it, so searching can
 * never surface an archived patient.
 */
export async function listPatients(
  query: PatientListQuery = {}
): Promise<PatientListDto> {
  await requirePermission(PERMISSIONS.PATIENTS_READ);

  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const pageSize = clamp(query.limit);
  const where = { ...ACTIVE_PATIENT, ...searched(query.search) };

  const [patients, totalCount] = await Promise.all([
    getPrisma().patient.findMany({
      where,
      orderBy: NEWEST_FIRST,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    getPrisma().patient.count({ where }),
  ]);

  return {
    rows: patients.map(toPatientSummary),
    page,
    pageSize,
    totalCount,
  };
}

/**
 * The clause a search term adds, or nothing when no term was typed.
 *
 * Any part of the name counts, and so do the email and the patient code, because
 * reception looks a patient up by whichever of the three is on the slip in front
 * of them. A blank term is not a filter, so an untouched box lists every active
 * patient rather than none.
 */
function searched(term: string | undefined) {
  const searched = term?.trim();

  if (!searched) return null;

  const contains = { contains: searched, mode: "insensitive" } as const;

  return {
    OR: [
      { firstName: contains },
      { middleName: contains },
      { lastName: contains },
      { email: contains },
      { patientCode: contains },
    ],
  };
}

export async function listAdmittedPatients(): Promise<AdmittedPatientDto[]> {
  await requirePermission(PERMISSIONS.PATIENTS_READ);

  const patients = await getPrisma().patient.findMany({
    where: { ...ACTIVE_PATIENT, patientType: "INPATIENT" },
    orderBy: { createdAt: "desc" },
  });

  return patients.map(toAdmittedPatient);
}

/** Reads an active patient, or null when it is missing or archived. */
export async function getPatientDetail(
  id: string
): Promise<PatientDetailDto | null> {
  await requirePermission(PERMISSIONS.PATIENTS_READ);

  const patient = await getPrisma().patient.findFirst({
    where: { id, ...ACTIVE_PATIENT },
  });

  return patient ? toPatientDetail(patient) : null;
}

function clamp(limit: number | undefined): number {
  if (limit === undefined || Number.isNaN(limit)) return DEFAULT_LIST_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIST_LIMIT);
}
