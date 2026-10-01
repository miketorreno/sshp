/**
 * The rows a visit spec starts from: an active patient, an archived one, a
 * provider, and a visit. Tests override only the rows their case is about, so a
 * test reads as the one situation it describes rather than as a whole clinic.
 */

import {
  clinicTimeZone,
  startOfDay,
  toDateInputValue,
  today,
} from "@/lib/clinic-time";
import type { VisitTable } from "./visit-table";

export const PATIENT = {
  id: "patient-1",
  patientCode: "PAT-001",
  firstName: "Ada",
  middleName: "Quincy",
  lastName: "Lovelace",
  dateOfBirth: new Date("1815-12-10T00:00:00.000Z"),
  gender: "Female",
  deletedAt: null,
};

export const ARCHIVED_PATIENT = {
  ...PATIENT,
  id: "patient-2",
  patientCode: "PAT-002",
  deletedAt: new Date("2026-02-01T00:00:00.000Z"),
};

export const PROVIDER = {
  id: "user-1",
  name: "Dr Iris",
  role: "DOCTOR",
  deletedAt: null,
};

export const SESSION = {
  session: { id: "session-1", userId: "user-1" },
  user: {
    id: "user-1",
    email: "doctor@clinic.test",
    role: "DOCTOR",
    isActive: true,
  },
};

export const STARTED = new Date("2026-03-02T09:00:00.000Z");
export const CHECKED_OUT = new Date("2026-03-02T10:30:00.000Z");

export function visit(overrides: Record<string, unknown> = {}) {
  return {
    id: "visit-1",
    patientId: "patient-1",
    providerId: "user-1",
    createdById: "user-1",
    updatedById: null,
    appointmentId: null,
    visitType: "CLINIC",
    startDateTime: STARTED,
    endDateTime: null,
    reason: "Annual check",
    createdAt: new Date("2026-01-02T03:04:05.000Z"),
    updatedAt: new Date("2026-01-02T03:04:05.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

export function vitals(overrides: Record<string, unknown> = {}) {
  return {
    id: "vitals-1",
    visitId: "visit-1",
    recordedById: "user-1",
    recordedAt: new Date("2026-03-02T09:30:00.000Z"),
    height: 165,
    weight: 60,
    systolicBP: 120,
    diastolicBP: 80,
    heartRate: 72,
    temperatureCelsius: 36.8,
    respiratoryRate: 16,
    oxygenSaturation: 98,
    glucose: 90,
    cholesterol: 180,
    deletedAt: null,
    ...overrides,
  };
}

export function labOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "lab-order-1",
    visitId: "visit-1",
    orderedById: "user-1",
    orderedAt: new Date("2026-03-02T09:35:00.000Z"),
    completedAt: null,
    orderStatus: "REQUESTED",
    labType: "Complete Blood Count",
    notes: null,
    result: null,
    deletedAt: null,
    ...overrides,
  };
}

export function imagingOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "imaging-order-1",
    visitId: "visit-1",
    orderedById: "user-1",
    orderedAt: new Date("2026-03-02T09:36:00.000Z"),
    completedAt: null,
    orderStatus: "REQUESTED",
    imagingType: "Chest X-Ray (2 views)",
    notes: null,
    result: null,
    deletedAt: null,
    ...overrides,
  };
}

export function medOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "med-order-1",
    visitId: "visit-1",
    orderedById: "user-1",
    medicationId: "medication-1",
    orderedAt: new Date("2026-03-02T09:37:00.000Z"),
    completedAt: null,
    orderStatus: "REQUESTED",
    dosage: "500mg",
    frequency: "Twice a day",
    route: "Oral",
    notes: null,
    deletedAt: null,
    ...overrides,
  };
}

/** A medication a request can name, from the pharmacy's catalogue. */
export function medication(overrides: Record<string, unknown> = {}) {
  return {
    id: "medication-1",
    name: "Amoxicillin",
    brandName: "Amoxil",
    description: "Penicillin antibiotic",
    stockQuantity: 40,
    deletedAt: null,
    ...overrides,
  };
}

/**
 * A moment relative to the clinic's today, so a spec can say "yesterday" without
 * hard-coding a day. The clinic's day opens in the clinic's zone, so a spec is
 * about the clinic's timeline rather than the test runner's.
 */
export const hoursFromStartOfToday = (hours: number) => {
  const zone = clinicTimeZone();

  return new Date(startOfDay(today(zone), zone)!.getTime() + hours * 3_600_000);
};

/** The clinic's today and the day before it, as reads name a window. */
export const clinicToday = () => today(clinicTimeZone());

export const clinicYesterday = () => {
  const zone = clinicTimeZone();

  // An hour before the clinic's day opens is the day before it, whatever the
  // zone's offset is.
  return toDateInputValue(
    new Date(startOfDay(today(zone), zone)!.getTime() - 3_600_000),
    zone,
  );
};

/** Replaces the table's rows with a clinic, keeping only what a case supplies. */
export function seedVisits(
  table: VisitTable,
  {
    visits = [visit()],
    patients = [PATIENT, ARCHIVED_PATIENT],
    users = [PROVIDER],
    vitals: vitalsRows = [],
    labOrders = [],
    imagingOrders = [],
    medOrders = [],
    clinicalNotes = [],
    diagnoses = [],
    procedures = [],
    medications: medicationRows = [],
  }: Partial<Record<keyof VisitTable, Record<string, unknown>[]>> = {},
) {
  const replace = (name: keyof VisitTable, rows: Record<string, unknown>[]) => {
    const target = table[name] as Record<string, unknown>[];

    target.splice(0, target.length, ...rows.map((row) => ({ ...row })));
  };

  replace("visits", visits);
  replace("patients", patients);
  replace("users", users);
  replace("vitals", vitalsRows);
  replace("labOrders", labOrders);
  replace("imagingOrders", imagingOrders);
  replace("medOrders", medOrders);
  replace("clinicalNotes", clinicalNotes);
  replace("diagnoses", diagnoses);
  replace("procedures", procedures);
  replace("medications", medicationRows);
  table.destroyed.splice(0, table.destroyed.length);
}
