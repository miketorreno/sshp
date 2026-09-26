import { z } from "zod";

/**
 * The patient form contract. A submitted form owns every field it renders, so a
 * cleared field is stored as an empty value rather than silently keeping the
 * previous one.
 */

const PATIENT_FORM_FIELDS = [
  "firstName",
  "middleName",
  "lastName",
  "dateOfBirth",
  "gender",
  "bloodGroup",
  "placeOfBirth",
  "occupation",
  "phone",
  "email",
  "address",
  "country",
  "guardian",
  "referredBy",
  "referredDate",
] as const;

const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const optionalText = z
  .preprocess(emptyToNull, z.string().trim().min(1).nullish())
  .transform((value) => value ?? null);

const optionalDate = z
  .preprocess(emptyToNull, z.coerce.date().nullish())
  .transform((value) => value ?? null);

export const patientInputSchema = z.object({
  firstName: z.string().trim().min(2),
  middleName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  dateOfBirth: z.coerce.date(),
  gender: z.enum(["Male", "Female", "Other"]),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  placeOfBirth: optionalText,
  occupation: optionalText,
  phone: optionalText,
  email: z.email(),
  address: optionalText,
  country: optionalText,
  guardian: optionalText,
  referredBy: optionalText,
  referredDate: optionalDate,
});

export function patientInputFromFormData(formData: FormData) {
  return Object.fromEntries(
    PATIENT_FORM_FIELDS.map((field) => [field, formData.get(field)])
  );
}
