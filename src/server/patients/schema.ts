import { z } from "zod";
import { clinicTimeZone, startOfDay } from "@/lib/clinic-time";

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

/**
 * A calendar day a form submitted, resolved in the clinic's own time zone.
 *
 * A `date` input sends `2001-06-15`, a *day* rather than a moment. `Date` would
 * read it as server-local midnight, so a patient born in Manila would be recorded
 * with a birth date that reads as the day before anywhere west of UTC.
 */
const clinicDay = z.preprocess(
  (value) =>
    typeof value === "string"
      ? startOfDay(value, clinicTimeZone())
      : value,
  z.date({ error: "Enter a date" }),
);

/**
 * An optional day, where blank means "not recorded" and only blank means that.
 *
 * The blank case is settled by `emptyToNull` before `clinicDay` sees the value,
 * so the optionality in `.nullish()` only ever turns a genuine empty field into
 * null. An unresolvable date such as `2026-02-31` resolves to nothing, and
 * `clinicDay` rejects that outright rather than letting it pass for blank: a
 * mistyped date stored as an empty field is a date silently forgotten, which is
 * worse than a form that asks again.
 */
const optionalDate = z
  .preprocess(emptyToNull, clinicDay.nullish())
  .transform((value) => value ?? null);

export const patientInputSchema = z.object({
  firstName: z.string().trim().min(2),
  middleName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  dateOfBirth: clinicDay,
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
