import { describe, expect, it } from "vitest";

import {
  createVisitInputFromFormData,
  createVisitSchema,
  recordVitalsInputFromFormData,
  recordVitalsSchema,
  updateVisitInputFromFormData,
  updateVisitSchema,
} from "@/server/visits/schema";

const form = (fields: Record<string, string>) => {
  const formData = new FormData();

  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value);
  }

  return formData;
};

const vitalsForm = (overrides: Record<string, string> = {}) =>
  form({
    recordedAt: "2026-03-02T09:40",
    height: "165",
    weight: "",
    systolicBP: "110",
    diastolicBP: "70",
    heartRate: "68",
    temperatureCelsius: "36.5",
    respiratoryRate: "14",
    oxygenSaturation: "99",
    glucose: "",
    cholesterol: "",
    ...overrides,
  });

describe("visit schemas", () => {
  it("reads a submitted visit form, treating a cleared reason as no reason", () => {
    const parsed = createVisitSchema.safeParse(
      createVisitInputFromFormData(
        form({
          patientId: "patient-1",
          startDateTime: "2026-03-02T09:00",
          visitType: "CLINIC",
          reason: "   ",
        }),
      ),
    );

    expect(parsed.success && parsed.data).toEqual({
      patientId: "patient-1",
      startDateTime: new Date("2026-03-02T09:00"),
      visitType: "CLINIC",
      reason: null,
    });
  });

  it("asks for a patient when a create does not name one", () => {
    const parsed = createVisitSchema.safeParse({
      startDateTime: "2026-03-02T09:00",
      visitType: "CLINIC",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]).toMatchObject({
      path: ["patientId"],
      message: "Select a patient",
    });
  });

  it("reads an edit as owning no patient, so a visit is never re-assigned", () => {
    // The edit names the visit and how it reads. A patient in the submission is
    // not part of that contract, so it is dropped rather than carried through.
    const parsed = updateVisitSchema.safeParse({
      patientId: "patient-2",
      startDateTime: "2026-03-02T09:00",
      visitType: "CLINIC",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && "patientId" in parsed.data).toBe(false);

    const submitted = updateVisitInputFromFormData(
      form({ startDateTime: "2026-03-02T09:00", visitType: "CLINIC" }),
    );

    expect("patientId" in submitted).toBe(false);
  });

  describe("vitals", () => {
    it("reads a blank measurement as no reading rather than a reading of zero", () => {
      const parsed = recordVitalsSchema.safeParse(
        recordVitalsInputFromFormData(vitalsForm()),
      );

      expect(parsed.success && parsed.data).toMatchObject({
        recordedAt: new Date("2026-03-02T09:40"),
        height: 165,
        weight: null,
        glucose: null,
        cholesterol: null,
      });
    });

    it("keeps a recorded zero as zero", () => {
      const parsed = recordVitalsSchema.safeParse(
        recordVitalsInputFromFormData(
          vitalsForm({ weight: "0", glucose: "0" }),
        ),
      );

      expect(parsed.success && parsed.data).toMatchObject({
        weight: 0,
        glucose: 0,
      });
    });

    it("reports the box a number is missing from, rather than the whole form", () => {
      const parsed = recordVitalsSchema.safeParse(
        recordVitalsInputFromFormData(vitalsForm({ height: "tall" })),
      );

      expect(parsed.success).toBe(false);
      expect(parsed.error?.issues).toMatchObject([
        { path: ["height"], message: "Enter a number" },
      ]);
    });

    it("does not take a visit from the form, because the path owns it", () => {
      const submitted = recordVitalsInputFromFormData(vitalsForm());

      expect("visitId" in submitted).toBe(false);
    });
  });
});
