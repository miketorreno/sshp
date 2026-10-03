/**
 * The visit read models staff screens consume. They are plain browser-facing
 * data: ISO date strings instead of `Date` objects, no database bookkeeping, and
 * the patient, provider and clinical fields the visit views render.
 */

import type { RestoreBlockedBy } from "@/server/archive/contract";
import {
  restoreBlockedBy,
  toArchivedAt,
  toPatientRef,
  type ArchivedPatientRef,
} from "@/server/archive/dto";
import type {
  ClinicalNote,
  Diagnosis,
  ImagingOrder,
  LabOrder,
  MedicationOrder,
  OrderStatus,
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

/**
 * The archived-record read models the archive lists.
 *
 * Three records, because a visit and the readings and orders taken during it are
 * archived and restored in three turns: the archive unwinds from the visit down.
 */

/** An archived visit, as the archive lists it. */
export type ArchivedVisitDto = {
  id: string;
  visitType: VisitType;
  startDateTime: string;
  endDateTime: string | null;
  reason: string | null;
  patient: ArchivedPatientRef;
  /** When the visit was archived, as an instant the browser can read. */
  archivedAt: string;
  restoreBlockedBy: RestoreBlockedBy | null;
};

/** A vitals row with the visit it was taken during and that visit's patient. */
type ArchivedVitalsRow = Vitals & {
  recordedBy: User | null;
  visit: Visit & { patient: Patient };
};

/**
 * An archived reading.
 *
 * The readings as they were taken, plus the visit and patient it belongs to. The
 * readings are `VisitVitalsDto` rather than a shorter list because recognising the
 * record means reading the numbers, and a second shape for the same measurements
 * would be a second thing to keep in step with the schema.
 */
export type ArchivedVitalsDto = VisitVitalsDto & {
  visitId: string;
  patient: ArchivedPatientRef;
  archivedAt: string;
  restoreBlockedBy: RestoreBlockedBy | null;
};

/** Which table an archived order came from, which is how a restore is addressed. */
export type ArchivedOrderKind = "LAB" | "IMAGING" | "MEDICATION";

/**
 * An archived order of any of the three kinds, as one row.
 *
 * The three order tables are separate in the database and one thing to a reader, so
 * one row carries which table it came from: `kind` is what tells a caller which of
 * the three restore commands to call, and `orderName`/`instructions` hold whichever
 * of them says something the other two do not.
 */
export type ArchivedOrderDto = {
  kind: ArchivedOrderKind;
  id: string;
  visitId: string;
  orderedAt: string;
  orderStatus: OrderStatus;
  /** What was ordered: the lab test, the imaging study, or the medication. */
  orderName: string | null;
  /** How it was ordered. Only a medication order says, in its own three fields. */
  instructions: string | null;
  patient: ArchivedPatientRef;
  archivedAt: string;
  restoreBlockedBy: RestoreBlockedBy | null;
};

/** What the three kinds of order share, so one mapper can carry it. */
type ArchivedOrderRow = {
  id: string;
  visitId: string;
  orderedAt: Date;
  orderStatus: OrderStatus;
  deletedAt: Date | null;
  visit: Visit & { patient: Patient };
};

export type ArchivedLabOrder = LabOrder & ArchivedOrderRow;
export type ArchivedImagingOrder = ImagingOrder & ArchivedOrderRow;
export type ArchivedMedicationOrder = MedicationOrder &
  ArchivedOrderRow & { medication: { name: string } | null };

/**
 * An order from any of the three tables, tagged with the table it came from.
 *
 * Tagged rather than merged into one row type because the three rows are not the
 * same row: a lab order names a test and a medication order names a drug and how to
 * take it. The tag is what lets one list carry all three and still say which table
 * each row came from.
 */
export type TaggedArchivedOrder =
  | { kind: "LAB"; order: ArchivedLabOrder }
  | { kind: "IMAGING"; order: ArchivedImagingOrder }
  | { kind: "MEDICATION"; order: ArchivedMedicationOrder };

/** A visit row with the patient it belongs to, which is all the archive reads. */
type ArchivedVisitRow = Visit & { patient: Patient };

export function toArchivedVisit(visit: ArchivedVisitRow): ArchivedVisitDto {
  return {
    id: visit.id,
    visitType: visit.visitType,
    startDateTime: visit.startDateTime.toISOString(),
    endDateTime: visit.endDateTime ? visit.endDateTime.toISOString() : null,
    reason: visit.reason,
    patient: toPatientRef(visit.patient),
    archivedAt: toArchivedAt(visit.deletedAt),
    restoreBlockedBy: restoreBlockedBy({ patient: visit.patient }),
  };
}

export function toArchivedVitals(vitals: ArchivedVitalsRow): ArchivedVitalsDto {
  return {
    ...toVisitVitals(vitals),
    visitId: vitals.visitId,
    patient: toPatientRef(vitals.visit.patient),
    archivedAt: toArchivedAt(vitals.deletedAt),
    restoreBlockedBy: restoreBlockedBy({
      patient: vitals.visit.patient,
      visit: vitals.visit,
    }),
  };
}

/** The archived row for a tagged order, whichever table it came from. */
export function toArchivedOrder(row: TaggedArchivedOrder): ArchivedOrderDto {
  if (row.kind === "LAB") return toArchivedLabOrder(row.order);
  if (row.kind === "IMAGING") return toArchivedImagingOrder(row.order);

  return toArchivedMedicationOrder(row.order);
}

export function toArchivedLabOrder(order: ArchivedLabOrder): ArchivedOrderDto {
  return archivedOrder(order, {
    kind: "LAB",
    orderName: order.labType,
    instructions: null,
  });
}

export function toArchivedImagingOrder(
  order: ArchivedImagingOrder,
): ArchivedOrderDto {
  return archivedOrder(order, {
    kind: "IMAGING",
    orderName: order.imagingType,
    instructions: null,
  });
}

export function toArchivedMedicationOrder(
  order: ArchivedMedicationOrder,
): ArchivedOrderDto {
  return archivedOrder(order, {
    kind: "MEDICATION",
    // A medication can be removed from the catalogue while an order naming it
    // stands, so the name is absent rather than invented.
    orderName: order.medication?.name ?? null,
    instructions: `${order.dosage}, ${order.frequency}, ${order.route}`,
  });
}

function archivedOrder(
  order: ArchivedOrderRow,
  of: Pick<ArchivedOrderDto, "kind" | "orderName" | "instructions">,
): ArchivedOrderDto {
  return {
    ...of,
    id: order.id,
    visitId: order.visitId,
    orderedAt: order.orderedAt.toISOString(),
    orderStatus: order.orderStatus,
    patient: toPatientRef(order.visit.patient),
    archivedAt: toArchivedAt(order.deletedAt),
    // An order cannot be restored into an archived visit, and a visit under an
    // archived patient cannot be restored at all, so the visit is named when it is
    // archived and the patient is named when it is the patient.
    restoreBlockedBy: restoreBlockedBy({
      patient: order.visit.patient,
      visit: order.visit,
    }),
  };
}
