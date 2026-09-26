import { getPrisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  SEARCH_LIMIT,
  type PatientListQuery,
} from "./contract";
import {
  toAdmittedPatient,
  toPatientDetail,
  toPatientSummary,
  type AdmittedPatientDto,
  type PatientDetailDto,
  type PatientSummaryDto,
} from "./dto";

/**
 * Patient reads for staff screens. Every read requires a session, and every
 * read hides archived patients: an archived record is history, not something
 * normal clinical screens show.
 */

const ACTIVE_PATIENT = { deletedAt: null } as const;

export async function listPatients(
  query: PatientListQuery = {}
): Promise<PatientSummaryDto[]> {
  await requireSession();

  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const limit = clamp(query.limit);

  const patients = await getPrisma().patient.findMany({
    where: ACTIVE_PATIENT,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return patients.map(toPatientSummary);
}

export async function searchPatients(
  query: string
): Promise<PatientSummaryDto[]> {
  await requireSession();

  const term = query.trim();

  if (!term) return [];

  const patients = await getPrisma().patient.findMany({
    where: {
      ...ACTIVE_PATIENT,
      OR: [
        { firstName: { contains: term, mode: "insensitive" } },
        { middleName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { patientCode: { contains: term, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: SEARCH_LIMIT,
  });

  return patients.map(toPatientSummary);
}

export async function listAdmittedPatients(): Promise<AdmittedPatientDto[]> {
  await requireSession();

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
  await requireSession();

  const patient = await getPrisma().patient.findFirst({
    where: { id, ...ACTIVE_PATIENT },
  });

  return patient ? toPatientDetail(patient) : null;
}

function clamp(limit: number | undefined): number {
  if (limit === undefined || Number.isNaN(limit)) return DEFAULT_LIST_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIST_LIMIT);
}
