/**
 * The patient read models staff screens consume. They are plain browser-facing
 * data: ISO date strings instead of `Date` objects, no database bookkeeping.
 */

import type { RestoreBlockedBy } from "@/server/archive/contract";
import { toArchivedAt } from "@/server/archive/dto";
import type { Patient } from "@/generated/prisma";

export type PatientSummaryDto = {
  id: string;
  patientCode: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string | null;
  phone: string | null;
  email: string;
  patientType: string;
  createdAt: string;
};

export type PatientDetailDto = PatientSummaryDto & {
  placeOfBirth: string | null;
  occupation: string | null;
  address: string | null;
  country: string | null;
  guardian: string | null;
  referredBy: string | null;
  referredDate: string | null;
  updatedAt: string;
};

/** An admitted patient, read as a patient rather than as a visit row. */
export type AdmittedPatientDto = PatientSummaryDto & {
  patientType: "INPATIENT";
};

/**
 * One page of patients, and the whole of what was asked for.
 *
 * `rows` is the page. `totalCount` is every patient that matched, across every
 * page, which is what lets a pager say "Page 2 of 7" and stop offering Next on
 * the last one. `page` and `pageSize` are the bounds the read actually honoured
 * after clamping, so a caller that asked for page 0 or a limit of 5000 learns
 * which page it is looking at rather than assuming the one it sent.
 */
export type PatientListDto = {
  rows: PatientSummaryDto[];
  page: number;
  pageSize: number;
  totalCount: number;
};

/**
 * An archived patient, as the archive lists it.
 *
 * Enough to recognise the record and say when it left, rather than everything
 * `PatientSummaryDto` carries: the archive answers "which patient, and can I
 * bring them back", not "show me this patient again".
 */
export type ArchivedPatientDto = {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  patientType: string;
  /** When the patient was archived, as an instant the browser can read. */
  archivedAt: string;
  /**
   * Nothing stands above a patient, so this is always null. It is here because the
   * archive renders one Restore column for every section, and a section that has no
   * ancestor to name says so the same way a clear one does.
   */
  restoreBlockedBy: RestoreBlockedBy | null;
};

export function toArchivedPatient(patient: Patient): ArchivedPatientDto {
  return {
    id: patient.id,
    patientCode: patient.patientCode,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: toIso(patient.dateOfBirth),
    gender: patient.gender,
    patientType: patient.patientType,
    archivedAt: toArchivedAt(patient.deletedAt),
    restoreBlockedBy: null,
  };
}

export function toPatientSummary(patient: Patient): PatientSummaryDto {
  return {
    id: patient.id,
    patientCode: patient.patientCode,
    firstName: patient.firstName,
    middleName: patient.middleName,
    lastName: patient.lastName,
    dateOfBirth: toIso(patient.dateOfBirth),
    gender: patient.gender,
    bloodGroup: patient.bloodGroup,
    phone: patient.phone,
    email: patient.email,
    patientType: patient.patientType,
    createdAt: toIso(patient.createdAt),
  };
}

export function toPatientDetail(patient: Patient): PatientDetailDto {
  return {
    ...toPatientSummary(patient),
    placeOfBirth: patient.placeOfBirth,
    occupation: patient.occupation,
    address: patient.address,
    country: patient.country,
    guardian: patient.guardian,
    referredBy: patient.referredBy,
    referredDate: toIso(patient.referredDate),
    updatedAt: toIso(patient.updatedAt),
  };
}

export function toAdmittedPatient(patient: Patient): AdmittedPatientDto {
  return { ...toPatientSummary(patient), patientType: "INPATIENT" };
}

function toIso(value: Date): string;
function toIso(value: Date | null): string | null;
function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}
