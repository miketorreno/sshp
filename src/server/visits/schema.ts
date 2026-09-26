import { z } from "zod";
import { VISIT_TYPES } from "./contract";

/**
 * The visit form contract. A submitted form owns every field it renders, so a
 * cleared field is stored as an empty value rather than silently keeping the
 * previous one.
 *
 * The provider is not a form field: a visit is attributed to the signed-in staff
 * member by the command, because the visit model records who opened it and who
 * last edited it, and the views read that attribution back. An edit does not move
 * a visit between patients, so only a create names the patient.
 *
 * Vitals are recorded as their own form inside a visit, so a vitals record holds
 * no visit field: the visit in the path owns the recording. The same holds for a
 * lab, imaging or medication request: the visit in the path owns the order, and a
 * medication request names the medication it orders rather than free text, so
 * what was chosen is what the order holds.
 */

const VISIT_FORM_FIELDS = ["startDateTime", "visitType", "reason"] as const;

const VITALS_FORM_FIELDS = [
  "recordedAt",
  "height",
  "weight",
  "systolicBP",
  "diastolicBP",
  "heartRate",
  "temperatureCelsius",
  "respiratoryRate",
  "oxygenSaturation",
  "glucose",
  "cholesterol",
] as const;

const LAB_ORDER_FORM_FIELDS = ["labType", "notes"] as const;

const IMAGING_ORDER_FORM_FIELDS = ["imagingType", "notes"] as const;

const MEDICATION_ORDER_FORM_FIELDS = [
  "medicationId",
  "dosage",
  "frequency",
  "route",
  "notes",
] as const;

const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const optionalText = z
  .preprocess(emptyToNull, z.string().trim().min(1).nullish())
  .transform((value) => value ?? null);

/** A field the order cannot be requested without, named in the message. */
const requiredText = (message: string) =>
  z.string({ error: message }).trim().min(1, message);

/**
 * A measurement is optional, but a measurement someone typed must be a number
 * they can read back: an empty box is no reading rather than a reading of zero,
 * and a zero someone recorded deliberately stays a zero.
 *
 * The blank is read before the number is coerced. Coercing first would turn both
 * an empty box and a missing field into a reading of zero, because that is what
 * the number zero means to a blank.
 */
const optionalMeasurement = z
  .preprocess(
    (value) =>
      typeof value === "string"
        ? value.trim() === ""
          ? null
          : Number(value)
        : value,
    z.number({ error: "Enter a number" }).nullish(),
  )
  .transform((value) => value ?? null);

const visitFields = {
  startDateTime: z.coerce.date(),
  visitType: z.enum(VISIT_TYPES),
  reason: optionalText,
};

const vitalsFields = {
  recordedAt: z.coerce.date(),
  height: optionalMeasurement,
  weight: optionalMeasurement,
  systolicBP: optionalMeasurement,
  diastolicBP: optionalMeasurement,
  heartRate: optionalMeasurement,
  temperatureCelsius: optionalMeasurement,
  respiratoryRate: optionalMeasurement,
  oxygenSaturation: optionalMeasurement,
  glucose: optionalMeasurement,
  cholesterol: optionalMeasurement,
};

export const createVisitSchema = z.object({
  patientId: z
    .string({ error: "Select a patient" })
    .trim()
    .min(1, "Select a patient"),
  ...visitFields,
});

export const updateVisitSchema = z.object(visitFields);

export const recordVitalsSchema = z.object(vitalsFields);

export const requestLabOrderSchema = z.object({
  labType: requiredText("Enter the lab test"),
  notes: optionalText,
});

export const requestImagingOrderSchema = z.object({
  imagingType: requiredText("Enter the imaging study"),
  notes: optionalText,
});

export const requestMedicationOrderSchema = z.object({
  medicationId: requiredText("Select a medication"),
  dosage: requiredText("Enter the dosage"),
  frequency: requiredText("Enter how often it is given"),
  route: requiredText("Enter the route"),
  notes: optionalText,
});

export function createVisitInputFromFormData(formData: FormData) {
  return Object.fromEntries([
    ["patientId", formData.get("patientId")],
    ...VISIT_FORM_FIELDS.map((field) => [field, formData.get(field)]),
  ]);
}

export function updateVisitInputFromFormData(formData: FormData) {
  return Object.fromEntries(
    VISIT_FORM_FIELDS.map((field) => [field, formData.get(field)]),
  );
}

export function recordVitalsInputFromFormData(formData: FormData) {
  return Object.fromEntries(
    VITALS_FORM_FIELDS.map((field) => [field, formData.get(field)]),
  );
}

export function requestLabOrderInputFromFormData(formData: FormData) {
  return Object.fromEntries(
    LAB_ORDER_FORM_FIELDS.map((field) => [field, formData.get(field)]),
  );
}

export function requestImagingOrderInputFromFormData(formData: FormData) {
  return Object.fromEntries(
    IMAGING_ORDER_FORM_FIELDS.map((field) => [field, formData.get(field)]),
  );
}

export function requestMedicationOrderInputFromFormData(formData: FormData) {
  return Object.fromEntries(
    MEDICATION_ORDER_FORM_FIELDS.map((field) => [field, formData.get(field)]),
  );
}
