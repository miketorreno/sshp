/**
 * The visit read models staff screens consume. They are plain browser-facing
 * data: ISO date strings instead of `Date` objects, no database bookkeeping, and
 * the patient, provider and clinical fields the visit views render.
 */

import type {
  ClinicalNote,
  Diagnosis,
  ImagingOrder,
  LabOrder,
  MedicationOrder,
  Patient,
  Procedure,
  Role,
  User,
  Vitals,
  Visit,
  VisitType,
} from "@/generated/prisma";

/** The patient data the visit views render, including the birth date an age is derived from. */
export type VisitPatientDto = {
  id: string;
  patientCode: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
};

/** The provider data the visit views render: who is examining the patient. */
export type VisitProviderDto = {
  id: string;
  name: string;
  role: Role;
};

export type VisitVitalsDto = {
  id: string;
  recordedAt: string;
  height: number | null;
  weight: number | null;
  systolicBP: number | null;
  diastolicBP: number | null;
  heartRate: number | null;
  temperatureCelsius: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  glucose: number | null;
  cholesterol: number | null;
  /** Who recorded the reading, when the record names one. */
  recordedBy: VisitProviderDto | null;
};

export type VisitLabOrderDto = {
  id: string;
  orderedAt: string;
  completedAt: string | null;
  orderStatus: LabOrder["orderStatus"];
  labType: string;
  notes: string | null;
  result: string | null;
  orderedBy: VisitProviderDto | null;
};

export type VisitImagingOrderDto = {
  id: string;
  orderedAt: string;
  completedAt: string | null;
  orderStatus: ImagingOrder["orderStatus"];
  imagingType: string;
  notes: string | null;
  result: string | null;
  orderedBy: VisitProviderDto | null;
};

export type VisitMedicationOrderDto = {
  id: string;
  orderedAt: string;
  completedAt: string | null;
  orderStatus: MedicationOrder["orderStatus"];
  medication: string | null;
  dosage: string;
  frequency: string;
  route: string;
  notes: string | null;
  orderedBy: VisitProviderDto | null;
};

export type VisitClinicalNoteDto = {
  id: string;
  noteType: string;
  content: string;
  author: VisitProviderDto | null;
  createdAt: string;
};

export type VisitDiagnosisDto = {
  id: string;
  icd10Code: string;
  description: string;
  isPrimary: boolean;
  diagnosedBy: VisitProviderDto | null;
};

export type VisitProcedureDto = {
  id: string;
  description: string;
  notes: string | null;
  performedBy: VisitProviderDto | null;
};

export type VisitSummaryDto = {
  id: string;
  patientId: string;
  providerId: string | null;
  visitType: VisitType;
  startDateTime: string;
  /** Set when the visit is checked out; a checked-out visit is read-only. */
  endDateTime: string | null;
  reason: string | null;
  patient: VisitPatientDto;
  provider: VisitProviderDto | null;
  createdAt: string;
};

export type VisitDetailDto = VisitSummaryDto & {
  updatedAt: string;
  vitals: VisitVitalsDto[];
  labOrders: VisitLabOrderDto[];
  imagingOrders: VisitImagingOrderDto[];
  medOrders: VisitMedicationOrderDto[];
  clinicalNotes: VisitClinicalNoteDto[];
  diagnoses: VisitDiagnosisDto[];
  procedures: VisitProcedureDto[];
};

/** A visit as a read returns it, with the relations the views render. */
export type VisitWithRelations = Visit & {
  patient: Patient;
  provider: User | null;
};

export type VisitDetailWithRelations = VisitWithRelations & {
  vitals: (Vitals & { recordedBy: User | null })[];
  labOrders: (LabOrder & { orderedBy: User | null })[];
  imagingOrders: (ImagingOrder & { orderedBy: User | null })[];
  medOrders: (MedicationOrder & {
    orderedBy: User | null;
    medication: { name: string } | null;
  })[];
  clinicalNotes: (ClinicalNote & { author: User | null })[];
  diagnoses: (Diagnosis & { diagnosedBy: User | null })[];
  procedures: (Procedure & { performedBy: User | null })[];
};

export function toVisitSummary(visit: VisitWithRelations): VisitSummaryDto {
  return {
    id: visit.id,
    patientId: visit.patientId,
    providerId: visit.providerId,
    visitType: visit.visitType,
    startDateTime: visit.startDateTime.toISOString(),
    endDateTime: visit.endDateTime ? visit.endDateTime.toISOString() : null,
    reason: visit.reason,
    patient: toVisitPatient(visit.patient),
    provider: visit.provider ? toVisitProvider(visit.provider) : null,
    createdAt: visit.createdAt.toISOString(),
  };
}

export function toVisitDetail(visit: VisitDetailWithRelations): VisitDetailDto {
  return {
    ...toVisitSummary(visit),
    updatedAt: visit.updatedAt.toISOString(),
    vitals: visit.vitals.map(toVisitVitals),
    labOrders: visit.labOrders.map(toVisitLabOrder),
    imagingOrders: visit.imagingOrders.map(toVisitImagingOrder),
    medOrders: visit.medOrders.map(toVisitMedicationOrder),
    clinicalNotes: visit.clinicalNotes.map((note) => ({
      id: note.id,
      noteType: note.noteType,
      content: note.content,
      author: note.author ? toVisitProvider(note.author) : null,
      createdAt: note.createdAt.toISOString(),
    })),
    diagnoses: visit.diagnoses.map((diagnosis) => ({
      id: diagnosis.id,
      icd10Code: diagnosis.icd10Code,
      description: diagnosis.description,
      isPrimary: diagnosis.isPrimary,
      diagnosedBy: diagnosis.diagnosedBy
        ? toVisitProvider(diagnosis.diagnosedBy)
        : null,
    })),
    procedures: visit.procedures.map((procedure) => ({
      id: procedure.id,
      description: procedure.description,
      notes: procedure.notes,
      performedBy: procedure.performedBy
        ? toVisitProvider(procedure.performedBy)
        : null,
    })),
  };
}

function toVisitPatient(patient: Patient): VisitPatientDto {
  return {
    id: patient.id,
    patientCode: patient.patientCode,
    firstName: patient.firstName,
    middleName: patient.middleName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth.toISOString(),
    gender: patient.gender,
  };
}

function toVisitProvider(provider: User): VisitProviderDto {
  return { id: provider.id, name: provider.name, role: provider.role };
}

function toVisitVitals(
  vitals: Vitals & { recordedBy: User | null },
): VisitVitalsDto {
  return {
    id: vitals.id,
    recordedAt: vitals.recordedAt.toISOString(),
    height: vitals.height,
    weight: vitals.weight,
    systolicBP: vitals.systolicBP,
    diastolicBP: vitals.diastolicBP,
    heartRate: vitals.heartRate,
    temperatureCelsius: vitals.temperatureCelsius,
    respiratoryRate: vitals.respiratoryRate,
    oxygenSaturation: vitals.oxygenSaturation,
    glucose: vitals.glucose,
    cholesterol: vitals.cholesterol,
    recordedBy: vitals.recordedBy ? toVisitProvider(vitals.recordedBy) : null,
  };
}

function toVisitLabOrder(
  order: LabOrder & { orderedBy: User | null },
): VisitLabOrderDto {
  return {
    id: order.id,
    orderedAt: order.orderedAt.toISOString(),
    completedAt: order.completedAt ? order.completedAt.toISOString() : null,
    orderStatus: order.orderStatus,
    labType: order.labType,
    notes: order.notes,
    result: order.result,
    orderedBy: order.orderedBy ? toVisitProvider(order.orderedBy) : null,
  };
}

function toVisitImagingOrder(
  order: ImagingOrder & { orderedBy: User | null },
): VisitImagingOrderDto {
  return {
    id: order.id,
    orderedAt: order.orderedAt.toISOString(),
    completedAt: order.completedAt ? order.completedAt.toISOString() : null,
    orderStatus: order.orderStatus,
    imagingType: order.imagingType,
    notes: order.notes,
    result: order.result,
    orderedBy: order.orderedBy ? toVisitProvider(order.orderedBy) : null,
  };
}

function toVisitMedicationOrder(
  order: MedicationOrder & {
    orderedBy: User | null;
    medication: { name: string } | null;
  },
): VisitMedicationOrderDto {
  return {
    id: order.id,
    orderedAt: order.orderedAt.toISOString(),
    completedAt: order.completedAt ? order.completedAt.toISOString() : null,
    orderStatus: order.orderStatus,
    medication: order.medication ? order.medication.name : null,
    dosage: order.dosage,
    frequency: order.frequency,
    route: order.route,
    notes: order.notes,
    orderedBy: order.orderedBy ? toVisitProvider(order.orderedBy) : null,
  };
}
