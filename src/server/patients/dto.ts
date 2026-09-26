/**
 * The patient read models staff screens consume. They are plain browser-facing
 * data: ISO date strings instead of `Date` objects, no database bookkeeping.
 */

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
