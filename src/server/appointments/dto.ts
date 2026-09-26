/**
 * The appointment read models staff screens consume. They are plain
 * browser-facing data: ISO date strings instead of `Date` objects, no database
 * bookkeeping, and the patient and provider fields the appointment views render.
 */

import type {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  Patient,
  Role,
  User,
} from "@/generated/prisma";

/** An appointment as it reaches a read, with the relations the views render. */
export type AppointmentWithRelations = Appointment & {
  patient: Patient;
  provider: User | null;
};

export type AppointmentPatientDto = {
  id: string;
  patientCode: string;
  firstName: string;
  middleName: string;
  lastName: string;
};

/** The provider data the appointment views render: who the appointment is for. */
export type AppointmentProviderDto = {
  id: string;
  name: string;
  role: Role;
};

export type AppointmentSummaryDto = {
  id: string;
  patientId: string;
  providerId: string | null;
  startDateTime: string;
  endDateTime: string;
  appointmentType: AppointmentType;
  appointmentStatus: AppointmentStatus;
  reason: string | null;
  patient: AppointmentPatientDto;
  provider: AppointmentProviderDto | null;
  /** A check-in links a visit to the appointment, so the views know it is done. */
  checkedIn: boolean;
  createdAt: string;
};

export type AppointmentDetailDto = AppointmentSummaryDto & {
  updatedAt: string;
};

export function toAppointmentSummary(
  appointment: AppointmentWithRelations,
  checkedIn: boolean
): AppointmentSummaryDto {
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    providerId: appointment.providerId,
    startDateTime: appointment.startDateTime.toISOString(),
    endDateTime: appointment.endDateTime.toISOString(),
    appointmentType: appointment.appointmentType,
    appointmentStatus: appointment.appointmentStatus,
    reason: appointment.reason,
    patient: toAppointmentPatient(appointment.patient),
    provider: appointment.provider
      ? toAppointmentProvider(appointment.provider)
      : null,
    checkedIn,
    createdAt: appointment.createdAt.toISOString(),
  };
}

export function toAppointmentDetail(
  appointment: AppointmentWithRelations,
  checkedIn: boolean
): AppointmentDetailDto {
  return {
    ...toAppointmentSummary(appointment, checkedIn),
    updatedAt: appointment.updatedAt.toISOString(),
  };
}

function toAppointmentPatient(patient: Patient): AppointmentPatientDto {
  return {
    id: patient.id,
    patientCode: patient.patientCode,
    firstName: patient.firstName,
    middleName: patient.middleName,
    lastName: patient.lastName,
  };
}

function toAppointmentProvider(provider: User): AppointmentProviderDto {
  return { id: provider.id, name: provider.name, role: provider.role };
}
