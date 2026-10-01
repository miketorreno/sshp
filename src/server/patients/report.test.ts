import { beforeEach, describe, expect, it, vi } from "vitest";

const { table, getSession } = await vi.hoisted(async () => {
  const { createReportTable } = await import(
    "@/server/patients/test-support/report-table"
  );

  return { table: createReportTable(), getSession: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ getPrisma: () => table.prisma }));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { UnauthenticatedError } from "@/lib/session";
import { getPatientReport } from "@/server/patients/report";

const SESSION = {
  session: { id: "session-1", userId: "user-1" },
  user: { id: "user-1", email: "doctor@clinic.test" },
};

const NOW = new Date("2026-03-15T12:00:00.000Z");

const base = {
  id: "patient-1",
  patientCode: "PAT-001",
  firstName: "Ada",
  middleName: "Quincy",
  lastName: "Lovelace",
  dateOfBirth: new Date("1980-05-04T00:00:00.000Z"),
  gender: "Female",
  bloodGroup: "O+",
  placeOfBirth: null,
  occupation: null,
  phone: null,
  email: "ada@clinic.test",
  address: null,
  country: null,
  guardian: null,
  referredBy: null,
  referredDate: null,
  patientType: "OUTPATIENT",
  createdAt: new Date("2026-02-01T00:00:00.000Z"),
  updatedAt: new Date("2026-02-01T00:00:00.000Z"),
  deletedAt: null as Date | null,
};

/** A copy of the base row with a different id, email, and overrides. */
const patient = (id: string, overrides: Partial<typeof base> = {}) => ({
  ...base,
  id,
  email: `${id}@clinic.test`,
  ...overrides,
});

/** A patient whose age on `NOW` is `years`, so a band can be asserted. */
const aged = (years: number, overrides: Partial<typeof base> = {}) =>
  patient(`aged-${years}-${overrides.patientType ?? "OUTPATIENT"}`, {
    dateOfBirth: new Date(
      Date.UTC(
        NOW.getUTCFullYear() - years,
        NOW.getUTCMonth(),
        NOW.getUTCDate(),
      ),
    ),
    ...overrides,
  });

const seenOn = (
  patientId: string,
  day: string,
  overrides: { deletedAt?: Date | null } = {}
) => ({
  id: `visit-${patientId}-${day}`,
  patientId,
  startDateTime: new Date(`${day}T00:00:00.000Z`),
  deletedAt: overrides.deletedAt ?? null,
});

const report = () => getPatientReport("month", NOW);

describe("patient reporting", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
  });

  const seed = (
    patients: (typeof base)[] = [],
    visits: ReturnType<typeof seenOn>[] = []
  ) => {
    table.patients.splice(0, table.patients.length, ...patients);
    table.visits.splice(0, table.visits.length, ...visits);
  };

  it("requires a session", async () => {
    getSession.mockResolvedValue(null);

    await expect(report()).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  describe("total patients", () => {
    it("counts active patients, and not an archived one", async () => {
      // Archived inside the period: still counted a month ago, gone now.
      seed([
        base,
        patient("patient-2"),
        patient("archived", { deletedAt: new Date("2026-03-05T00:00:00Z") }),
      ]);

      expect((await report()).panels.totalPatients).toEqual({
        current: 2,
        previous: 3,
      });
    });

    it("compares against the panel a period earlier, not against activity", async () => {
      // Both patients existed a month ago; one was archived since. The standing
      // total fell without anyone being registered or seen in the period.
      seed([
        base,
        patient("patient-2", { deletedAt: new Date("2026-03-05T00:00:00Z") }),
      ]);

      expect((await report()).panels.totalPatients).toEqual({
        current: 1,
        previous: 2,
      });
    });
  });

  describe("new patients", () => {
    it("counts a registration inside the period, and only there", async () => {
      // `base` was registered 2026-02-01, which is inside the period *before*, so
      // it belongs in the comparison rather than the current figure;
      // `patient-3` predates both windows and belongs in neither.
      seed([
        base,
        patient("patient-2", { createdAt: new Date("2026-03-01T00:00:00Z") }),
        patient("patient-3", { createdAt: new Date("2026-01-10T00:00:00Z") }),
      ]);

      expect((await report()).panels.newPatients).toEqual({
        current: 1,
        previous: 1,
      });
    });

    it("counts a registration in the period before as the comparison", async () => {
      seed([
        patient("patient-2", { createdAt: new Date("2026-02-01T00:00:00Z") }),
      ]);

      expect((await report()).panels.newPatients).toEqual({
        current: 0,
        previous: 1,
      });
    });

    it("does not count a patient who was registered and then archived", async () => {
      seed([
        patient("patient-2", {
          createdAt: new Date("2026-03-01T00:00:00Z"),
          deletedAt: new Date("2026-03-02T00:00:00Z"),
        }),
      ]);

      expect((await report()).panels.newPatients.current).toBe(0);
    });
  });

  describe("archived patients", () => {
    it("counts an archive inside the period", async () => {
      seed([
        base,
        patient("patient-2", { deletedAt: new Date("2026-03-05T00:00:00Z") }),
      ]);

      expect((await report()).panels.archivedPatients).toEqual({
        current: 1,
        previous: 0,
      });
    });

    it("counts an archive in the period before as the comparison", async () => {
      seed([
        patient("patient-2", { deletedAt: new Date("2026-02-05T00:00:00Z") }),
      ]);

      expect((await report()).panels.archivedPatients).toEqual({
        current: 0,
        previous: 1,
      });
    });
  });

  describe("patients seen", () => {
    it("counts a patient seen inside the period", async () => {
      seed([base], [seenOn("patient-1", "2026-03-02")]);

      expect((await report()).panels.seenPatients).toEqual({
        current: 1,
        previous: 0,
      });
    });

    it("counts a patient seen several times in the period once", async () => {
      seed(
        [base],
        [seenOn("patient-1", "2026-03-02"), seenOn("patient-1", "2026-03-09")]
      );

      expect((await report()).panels.seenPatients.current).toBe(1);
    });

    it("does not count a visit of an archived patient as activity", async () => {
      seed(
        [patient("patient-1", { deletedAt: new Date("2026-02-10T00:00:00Z") })],
        [seenOn("patient-1", "2026-03-02")]
      );

      expect((await report()).panels.seenPatients.current).toBe(0);
    });

    it("does not count an archived visit as activity", async () => {
      seed(
        [base],
        [
          seenOn("patient-1", "2026-03-02", {
            deletedAt: new Date("2026-03-03T00:00:00Z"),
          }),
        ]
      );

      expect((await report()).panels.seenPatients.current).toBe(0);
    });

    it("counts a visit in the period before as the comparison", async () => {
      seed([base], [seenOn("patient-1", "2026-02-02")]);

      expect((await report()).panels.seenPatients).toEqual({
        current: 0,
        previous: 1,
      });
    });
  });

  describe("age groups", () => {
    it("puts every active patient in exactly one band, and no archived one", async () => {
      seed([
        aged(7),
        aged(17),
        aged(18),
        aged(64),
        aged(65),
        aged(90),
        // The boundary values themselves: 17 is the top of a band and 18 the
        // bottom of the next, so a band edge that drifted would show up here.
        aged(11, { deletedAt: new Date("2026-02-01T00:00:00Z") }),
      ]);

      const { ageGroups } = await report();

      expect(ageGroups.map((band) => [band.label, band.count])).toEqual([
        ["0-17", 2],
        ["18-64", 2],
        ["65+", 2],
        ["Unknown", 0],
      ]);
      expect(ageGroups.reduce((total, band) => total + band.count, 0)).toBe(6);
    });

    it("reads a birthday that has not happened yet as not yet a year older", async () => {
      // On 2026-03-15, a patient born 2008-03-20 is still 17; one born
      // 2008-03-10 is already 18.
      seed([
        patient("younger", {
          dateOfBirth: new Date("2008-03-20T00:00:00.000Z"),
        }),
        patient("older", {
          dateOfBirth: new Date("2008-03-10T00:00:00.000Z"),
        }),
      ]);

      const { ageGroups } = await report();

      expect(ageGroups[0].count).toBe(1);
      expect(ageGroups[1].count).toBe(1);
    });

    it("counts an unreadable birth date as unknown rather than dropping it", async () => {
      seed([
        patient("known"),
        patient("broken", {
          dateOfBirth: new Date("not a date"),
        }),
      ]);

      const { ageGroups } = await report();

      expect(ageGroups.find((band) => band.key === "unknown")?.count).toBe(1);
      expect(ageGroups.reduce((total, band) => total + band.count, 0)).toBe(2);
    });

    it("reports every band, including the empty ones, so a chart keeps its shape", async () => {
      seed([aged(30)]);

      expect((await report()).ageGroups).toHaveLength(4);
    });
  });

  describe("patient types", () => {
    it("breaks the panel down by every type the schema allows", async () => {
      seed([
        patient("outpatient"),
        patient("inpatient", { patientType: "INPATIENT" }),
        patient("inpatient-2", { patientType: "INPATIENT" }),
      ]);

      expect((await report()).patientTypes).toEqual([
        { patientType: "OUTPATIENT", count: 1 },
        { patientType: "INPATIENT", count: 2 },
      ]);
    });

    it("leaves out an archived patient from the breakdown", async () => {
      seed([
        patient("inpatient", { patientType: "INPATIENT" }),
        patient("archived", {
          patientType: "INPATIENT",
          deletedAt: new Date("2026-02-01T00:00:00Z"),
        }),
      ]);

      expect((await report()).patientTypes).toEqual([
        { patientType: "OUTPATIENT", count: 0 },
        { patientType: "INPATIENT", count: 1 },
      ]);
    });
  });

  describe("the window it reports over", () => {
    it("names the window it counted and the one it compared against", async () => {
      seed();

      const reported = await report();

      expect(reported.period).toEqual({
        kind: "month",
        from: "2026-02-13T12:00:00.000Z",
        to: "2026-03-15T12:00:00.000Z",
      });
      expect(reported.previousPeriod).toEqual({
        from: "2026-01-14T12:00:00.000Z",
        to: "2026-02-13T12:00:00.000Z",
      });
    });

    it("reads a week as seven days behind it, not as a calendar week", async () => {
      seed();

      const reported = await getPatientReport("week", NOW);

      expect(reported.period).toEqual({
        kind: "week",
        from: "2026-03-08T12:00:00.000Z",
        to: "2026-03-15T12:00:00.000Z",
      });
    });

    it("reaches further back for a longer period, all three ending today", async () => {
      seed();

      const [month, quarter, year] = await Promise.all([
        getPatientReport("month", NOW),
        getPatientReport("quarter", NOW),
        getPatientReport("year", NOW),
      ]);

      // Every window ends at the same instant, so only the start moves: a longer
      // period is one that reaches further back, never one that ends later.
      expect([month.period.to, quarter.period.to, year.period.to]).toEqual([
        NOW.toISOString(),
        NOW.toISOString(),
        NOW.toISOString(),
      ]);
      expect(new Date(quarter.period.from).getTime()).toBeLessThan(
        new Date(month.period.from).getTime(),
      );
      expect(new Date(year.period.from).getTime()).toBeLessThan(
        new Date(quarter.period.from).getTime(),
      );
    });
  });

  it("reports an empty clinic as zeroes rather than as nothing at all", async () => {
    seed();

    const reported = await report();

    expect(reported.panels).toEqual({
      totalPatients: { current: 0, previous: 0 },
      newPatients: { current: 0, previous: 0 },
      archivedPatients: { current: 0, previous: 0 },
      seenPatients: { current: 0, previous: 0 },
    });
    expect(reported.patientTypes.every((type) => type.count === 0)).toBe(true);
  });
});