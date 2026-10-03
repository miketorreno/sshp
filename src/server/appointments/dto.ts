/**
 * The appointment read models staff screens consume. They are plain
 * browser-facing data: ISO date strings instead of `Date` objects, no database
 * bookkeeping, and the patient and provider fields the appointment views render.
 */

import type { RestoreBlockedBy } from "@/server/archive/contract";
import {
  restoreBlockedBy,
  toArchivedAt,
  toPatientRef,
  type ArchivedPatientRef,
} from "@/server/archive/dto";
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

/**
 * An archived appointment, as the archive lists it.
 *
 * An archived appointment cannot be linked to anywhere: the appointment page reads
 * active appointments only, so the patient is named here instead of offered as a
 * route that would answer "not found".
 */
export type ArchivedAppointmentDto = {
  id: string;
  startDateTime: string;
  endDateTime: string;
  appointmentType: AppointmentType;
  appointmentStatus: AppointmentStatus;
  reason: string | null;
  patient: ArchivedPatientRef;
  /** When the appointment was archived, as an instant the browser can read. */
  archivedAt: string;
  restoreBlockedBy: RestoreBlockedBy | null;
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

/** An appointment row with the patient it belongs to, which the archive needs. */
export type ArchivedAppointment = Appointment & { patient: Patient };

export function toArchivedAppointment(
  appointment: ArchivedAppointment,
): ArchivedAppointmentDto {
  return {
    id: appointment.id,
    startDateTime: appointment.startDateTime.toISOString(),
    endDateTime: appointment.endDateTime.toISOString(),
    appointmentType: appointment.appointmentType,
    appointmentStatus: appointment.appointmentStatus,
    reason: appointment.reason,
    patient: toPatientRef(appointment.patient),
    archivedAt: toArchivedAt(appointment.deletedAt),
    // An appointment of an archived patient is not restorable yet: the command
    // refuses it, and no read can reach the appointment while the patient is out of
    // the way. Naming the patient is the difference between a reader who knows
    // which restore to do first and one who discovers it by being refused.
    restoreBlockedBy: restoreBlockedBy({ patient: appointment.patient }),
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
