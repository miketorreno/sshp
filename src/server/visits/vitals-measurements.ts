/**
 * The measurements a set of vitals holds.
 *
 * Each measurement names the field it is stored in, the label a clinician reads,
 * and the unit that label promises. Keeping the three together is the point: a
 * label that omits its unit is a reading nobody can interpret (a weight of 60 is
 * kilos or stones depending on who is looking), and a unit the stored column
 * cannot hold is a reading the database silently truncates.
 *
 * The stored columns are fixed by the `Vitals` model, so the units here are the
 * ones the data already means, made visible rather than invented.
 */

import type { Vitals } from "@/generated/prisma";

export type VitalsMeasurement = {
  /**
   * The `Vitals` column this measurement is stored in. Typed as the column rather
   * than as text, so the catalogue names columns that exist: a rename would fail
   * here rather than silently reading `undefined` off a row at runtime.
   */
  field: keyof Omit<
    Vitals,
    | "id"
    | "visitId"
    | "visit"
    | "recordedById"
    | "recordedBy"
    | "recordedAt"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
  >;
  /** The name a clinician reads, with the unit it is measured in. */
  label: string;
  /** The unit the label promises, on its own, for a table header. */
  unit: string;
  /**
   * Whether the form offers whole numbers only, because the stored column holds
   * whole numbers. A clinician entering `70.5` for a height would be refused by
   * the column rather than rounded, so the input says so first.
   */
  wholeNumbersOnly: boolean;
};

export const VITALS_MEASUREMENTS = [
  { field: "height", label: "Height (cm)", unit: "cm", wholeNumbersOnly: true },
  {
    field: "weight",
    label: "Weight (kg)",
    unit: "kg",
    wholeNumbersOnly: false,
  },
  {
    field: "systolicBP",
    label: "Systolic (mmHg)",
    unit: "mmHg",
    wholeNumbersOnly: true,
  },
  {
    field: "diastolicBP",
    label: "Diastolic (mmHg)",
    unit: "mmHg",
    wholeNumbersOnly: true,
  },
  {
    field: "heartRate",
    label: "Heart Rate (bpm)",
    unit: "bpm",
    wholeNumbersOnly: true,
  },
  {
    field: "temperatureCelsius",
    label: "Temperature (°C)",
    unit: "°C",
    wholeNumbersOnly: false,
  },
  {
    field: "respiratoryRate",
    label: "Respiratory Rate (breaths/min)",
    unit: "breaths/min",
    wholeNumbersOnly: true,
  },
  {
    field: "oxygenSaturation",
    label: "Oxygen Saturation (%)",
    unit: "%",
    wholeNumbersOnly: false,
  },
  {
    field: "glucose",
    label: "Glucose (mg/dL)",
    unit: "mg/dL",
    wholeNumbersOnly: true,
  },
  {
    field: "cholesterol",
    label: "Cholesterol (mg/dL)",
    unit: "mg/dL",
    wholeNumbersOnly: true,
  },
] as const satisfies readonly VitalsMeasurement[];

/**
 * How a measurement reads when it was recorded.
 *
 * Zero is a reading, not an absence: a pulse of 0 and a temperature of 0 are both
 * things someone saw and wrote down, and the vitals table has to print them
 * rather than leaving the cell blank, which is how a recorded value and a box
 * nobody filled in look identical. A null is the only thing that reads as nothing.
 */
export function formatMeasurement(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";

  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(2)));
}
