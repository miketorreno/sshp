import { describe, expect, it } from "vitest";

import {
  formatMeasurement,
  VITALS_MEASUREMENTS,
} from "@/server/visits/vitals-measurements";

/**
 * A measurement's unit is only honest if the database can hold the precision it
 * promises, and only useful if the form and the table agree on the name. These
 * are the two ways that quietly goes wrong: a "70.5 kg" that stores as 70, or a
 * column called `systolicBP` labelled "Systolic" with no unit, which reads as a
 * number until someone guesses mmol/L.
 */
describe("the vitals measurement catalogue", () => {
  it("names every stored measurement exactly once", () => {
    // Written out rather than derived, because the point is that it is the list a
    // reviewer checks against the `Vitals` model by eye. `field` is typed as
    // `keyof Vitals`, so an entry naming a column that does not exist cannot
    // compile; what a type cannot say is that a column is *missing* from here,
    // which is what this list is for.
    expect(VITALS_MEASUREMENTS.map((m) => m.field).sort()).toEqual([
      "cholesterol",
      "diastolicBP",
      "glucose",
      "heartRate",
      "height",
      "oxygenSaturation",
      "respiratoryRate",
      "systolicBP",
      "temperatureCelsius",
      "weight",
    ]);
  });

  it("promises the unit in the label a clinician reads", () => {
    for (const measurement of VITALS_MEASUREMENTS) {
      expect(measurement.label).toContain(`(${measurement.unit})`);
    }
  });

  it("labels a measurement whose column is a float as accepting decimals", () => {
    // A float column has room for the decimals the form's `step="any"` offers;
    // an Int column does not, so promising decimals there would be a lie the
    // database tells at the moment of recording.
    const floatColumns = VITALS_MEASUREMENTS.filter(
      (m) => !m.wholeNumbersOnly,
    ).map((m) => m.field);

    expect([...floatColumns].sort()).toEqual([
      "oxygenSaturation",
      "temperatureCelsius",
      "weight",
    ]);
  });
});

describe("formatting a measurement", () => {
  it("reads as nothing when nothing was measured", () => {
    expect(formatMeasurement(null)).toBe("");
    expect(formatMeasurement(undefined)).toBe("");
  });

  it("reads zero as the reading it is, not as an empty cell", () => {
    // A recorded 0 and a box nobody filled in both render as a blank cell
    // otherwise, so a real reading of zero disappears from the record.
    expect(formatMeasurement(0)).toBe("0");
  });

  it("reads whole numbers without a decimal tail", () => {
    expect(formatMeasurement(120)).toBe("120");
  });

  it("keeps the decimals a float column was given", () => {
    expect(formatMeasurement(70.5)).toBe("70.5");
    expect(formatMeasurement(98.765)).toBe("98.77");
  });
});
