import { describe, expect, it } from "vitest";
import { restoreBlockedBy, toArchivedAt, toPatientRef } from "@/server/archive/dto";

const ada = {
  id: "patient-1",
  firstName: "Ada",
  middleName: "Quincy",
  lastName: "Lovelace",
  deletedAt: new Date("2026-02-01T00:00:00.000Z"),
};

describe("when a row was archived", () => {
  it("is the instant the row carries", () => {
    expect(toArchivedAt(new Date("2026-03-05T09:00:00.000Z"))).toBe(
      "2026-03-05T09:00:00.000Z",
    );
  });

  it("refuses to invent one for a row that is not archived", () => {
    // Only an archived row reaches an archive list, so a missing moment is a fault
    // to report rather than a time to make up.
    expect(() => toArchivedAt(null)).toThrow(
      /carries no archive moment/,
    );
  });
});

describe("the patient an archived row belongs to", () => {
  it("is named the way the screen says it", () => {
    expect(toPatientRef(ada)).toEqual({ id: "patient-1", name: "Ada Quincy Lovelace" });
  });

  it("names the middle part, because every patient has one", () => {
    // All three parts are required and validated on write, so a name is never a
    // guess about which parts exist.
    expect(toPatientRef({ ...ada, middleName: "Byron" })).toEqual({
      id: "patient-1",
      name: "Ada Byron Lovelace",
    });
  });
});

describe("what stands between a reader and a restore", () => {
  it("says nothing when the patient is active", () => {
    expect(
      restoreBlockedBy({ patient: { ...ada, deletedAt: null } }),
    ).toBeNull();
  });

  it("names an archived patient", () => {
    expect(restoreBlockedBy({ patient: ada })).toEqual({
      recordType: "Patient",
      id: "patient-1",
      patientName: "Ada Quincy Lovelace",
    });
  });

  it("names an archived visit", () => {
    expect(
      restoreBlockedBy({
        patient: { ...ada, deletedAt: null },
        visit: { id: "visit-1", deletedAt: new Date("2026-02-02T00:00:00.000Z") },
      }),
    ).toEqual({
      recordType: "Visit",
      id: "visit-1",
      patientName: "Ada Quincy Lovelace",
    });
  });

  it("names the patient rather than the visit beneath them", () => {
    // An archive unwinds from the top down. Naming the visit under an archived
    // patient would send the reader one step down a chain they have to unwind from
    // the top — and the restore they would attempt changes nothing while the
    // patient is still archived.
    expect(
      restoreBlockedBy({
        patient: ada,
        visit: { id: "visit-1", deletedAt: new Date("2026-02-02T00:00:00.000Z") },
      }),
    ).toEqual({
      recordType: "Patient",
      id: "patient-1",
      patientName: "Ada Quincy Lovelace",
    });
  });

  it("says nothing when the visit is missing entirely", () => {
    // A record with no visit cannot be inside an archived one.
    expect(
      restoreBlockedBy({ patient: { ...ada, deletedAt: null }, visit: null }),
    ).toBeNull();
  });
});