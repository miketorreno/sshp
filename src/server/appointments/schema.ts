import { z } from "zod";

/**
 * The appointment form contract. A submitted form owns every field it renders,
 * so a cleared field is stored as an empty value rather than silently keeping the
 * previous one.
 *
 * The provider is not a form field: an appointment is attributed to the signed-in
 * staff member by the command, because the appointment model only records who the
 * appointment is for and the views read that attribution back. An edit does not
 * move an appointment between patients, so only a create names the patient.
 */

const APPOINTMENT_FORM_FIELDS = [
  "startDateTime",
  "endDateTime",
  "appointmentType",
  "appointmentStatus",
  "reason",
] as const;

const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const optionalText = z
  .preprocess(emptyToNull, z.string().trim().min(1).nullish())
  .transform((value) => value ?? null);

const appointmentFields = {
  startDateTime: z.coerce.date(),
  endDateTime: z.coerce.date(),
  appointmentType: z.enum([
    "ADMISSION",
    "CLINIC",
    "EMERGENCY",
    "FOLLOWUP",
    "IMAGING",
    "LAB",
    "PHARMACY",
  ]),
  appointmentStatus: z
    .enum(["ATTENDED", "CANCELLED", "MISSED", "SCHEDULED"])
    .default("SCHEDULED"),
  reason: optionalText,
};

const endsAfterStart = (
  input: z.infer<typeof appointmentInputShape>
): boolean => input.endDateTime > input.startDateTime;

const appointmentInputShape = z.object(appointmentFields);

const appointmentWindow = {
  message: "The end must be after the start",
  path: ["endDateTime"],
};

export const createAppointmentSchema = z
  .object({
    patientId: z.string().trim().min(1, "Select a patient"),
    ...appointmentFields,
  })
  .refine(endsAfterStart, appointmentWindow);

export const updateAppointmentSchema = appointmentInputShape.refine(
  endsAfterStart,
  appointmentWindow
);

export function createAppointmentInputFromFormData(formData: FormData) {
  return Object.fromEntries([
    ["patientId", formData.get("patientId")],
    ...APPOINTMENT_FORM_FIELDS.map((field) => [field, formData.get(field)]),
  ]);
}

export function updateAppointmentInputFromFormData(formData: FormData) {
  return Object.fromEntries(
    APPOINTMENT_FORM_FIELDS.map((field) => [field, formData.get(field)])
  );
}

export function fieldErrorsFrom(
  error: z.ZodError
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (typeof field !== "string") continue;

    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }

  return fieldErrors;
}
