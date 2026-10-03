import { describe, expect, it } from "vitest";

import {
  createVisitInputFromFormData,
  createVisitSchema,
  recordVitalsInputFromFormData,
  recordVitalsSchema,
  requestImagingOrderInputFromFormData,
  requestImagingOrderSchema,
  requestLabOrderInputFromFormData,
  requestLabOrderSchema,
  requestMedicationOrderInputFromFormData,
  requestMedicationOrderSchema,
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
      startDateTime: new Date("2026-03-02T09:00:00.000Z"),
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
        recordedAt: new Date("2026-03-02T09:40:00.000Z"),
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

    it("stores the moment the clinician typed in the clinic's own zone", () => {
      // 09:40 in Manila is 01:40 UTC. Read as a server-local wall clock in any
      // other zone, this is the reading that shifts.
      process.env.CLINIC_TIME_ZONE = "Asia/Manila";

      try {
        const parsed = recordVitalsSchema.safeParse(
          recordVitalsInputFromFormData(vitalsForm()),
        );

        expect(parsed.success && parsed.data).toMatchObject({
          recordedAt: new Date("2026-03-02T01:40:00.000Z"),
        });
      } finally {
        delete process.env.CLINIC_TIME_ZONE;
      }
    });

    it("rejects a wall clock that is not a moment the clinic can act on", () => {
      const parsed = recordVitalsSchema.safeParse(
        recordVitalsInputFromFormData(
          vitalsForm({ recordedAt: "2026-02-31T09:40" }),
        ),
      );

      expect(parsed.success).toBe(false);
      expect(parsed.error?.issues).toMatchObject([
        { path: ["recordedAt"], message: "Enter a date and time" },
      ]);
    });

    it("does not take a visit from the form, because the path owns it", () => {
      const submitted = recordVitalsInputFromFormData(vitalsForm());

      expect("visitId" in submitted).toBe(false);
    });
  });

  describe("orders", () => {
    it("reads a lab request, treating cleared notes as no notes", () => {
      const parsed = requestLabOrderSchema.safeParse(
        requestLabOrderInputFromFormData(
          form({ labType: "Complete Blood Count", notes: "  " }),
        ),
      );

      expect(parsed.success && parsed.data).toEqual({
        labType: "Complete Blood Count",
        notes: null,
      });
    });

    it("asks for the lab test a request does not name", () => {
      const parsed = requestLabOrderSchema.safeParse({ notes: null });

      expect(parsed.success).toBe(false);
      expect(parsed.error?.issues[0]).toMatchObject({
        path: ["labType"],
        message: "Enter the lab test",
      });
    });

    it("reads an imaging request, treating cleared notes as no notes", () => {
      const parsed = requestImagingOrderSchema.safeParse(
        requestImagingOrderInputFromFormData(
          form({ imagingType: "Chest X-Ray (2 views)", notes: "" }),
        ),
      );

      expect(parsed.success && parsed.data).toEqual({
        imagingType: "Chest X-Ray (2 views)",
        notes: null,
      });
    });

    it("asks for the imaging study a request does not name", () => {
      const parsed = requestImagingOrderSchema.safeParse({ notes: null });

      expect(parsed.success).toBe(false);
      expect(parsed.error?.issues[0]).toMatchObject({
        path: ["imagingType"],
        message: "Enter the imaging study",
      });
    });

    it("reads a medication request, keeping the medication it names", () => {
      const parsed = requestMedicationOrderSchema.safeParse(
        requestMedicationOrderInputFromFormData(
          form({
            medicationId: "medication-1",
            dosage: "500mg",
            frequency: "Twice a day",
            route: "Oral",
            notes: "  ",
          }),
        ),
      );

      expect(parsed.success && parsed.data).toEqual({
        medicationId: "medication-1",
        dosage: "500mg",
        frequency: "Twice a day",
        route: "Oral",
        notes: null,
      });
    });

    it("asks for a medication when a request names none", () => {
      const parsed = requestMedicationOrderSchema.safeParse({
        medicationId: "",
        dosage: "500mg",
        frequency: "Twice a day",
        route: "Oral",
      });

      expect(parsed.success).toBe(false);
      expect(parsed.error?.issues[0]).toMatchObject({
        path: ["medicationId"],
        message: "Select a medication",
      });
    });

    it("takes no visit from any request form, because the path owns it", () => {
      expect(
        "visitId" in requestLabOrderInputFromFormData(form({ labType: "CBC" })),
      ).toBe(false);
      expect(
        "visitId" in
          requestImagingOrderInputFromFormData(form({ imagingType: "X-Ray" })),
      ).toBe(false);
      expect(
        "visitId" in
          requestMedicationOrderInputFromFormData(form({ dosage: "500mg" })),
      ).toBe(false);
    });
  });
});
