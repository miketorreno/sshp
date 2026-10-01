import type { Patient } from "@/generated/prisma";
import { createPatientTable, type PatientTable } from "./patient-table";

/**
 * An in-memory stand-in for the two tables the patient report reads: patients,
 * and the visits that make a patient "active". Tests seed rows, then read the
 * report and judge it as a reader would; they never assert on the queries it
 * issues, so the report is free to change how it asks for them.
 */

type Row = Record<string, unknown>;

type VisitRow = {
  id: string;
  patientId: string;
  startDateTime: Date;
  deletedAt: Date | null;
};

export type ReportTable = {
  prisma: PatientTable["prisma"] & {
    visit: {
      findMany: (args: {
        where?: Row;
        select?: Record<string, boolean>;
      }) => Promise<Row[]>;
    };
  };
  patients: Row[];
  visits: VisitRow[];
};

export function createReportTable(
  patients: Partial<Patient>[] = [],
  visits: VisitRow[] = []
): ReportTable {
  const patientsTable = createPatientTable(patients);

  return {
    prisma: {
      ...patientsTable.prisma,
      visit: {
        findMany: async ({ where, select }) =>
          visits
            .filter((visit) => visitMatches(visit, where))
            .map((visit) =>
              select === undefined
                ? { ...visit }
                : Object.fromEntries(
                    Object.entries(visit).filter(([field]) => select[field]),
                  ),
            ),
      },
    },
    patients: patientsTable.rows,
    visits,
  };
}

function visitMatches(visit: VisitRow, where: Row | undefined): boolean {
  if (!where) return true;

  return Object.entries(where).every(([field, condition]) => {
    if (field === "OR") {
      return ((condition as Row[]) ?? []).some((clause) =>
        visitMatches(visit, clause),
      );
    }

    if (field === "AND") {
      return ((condition as Row[]) ?? []).every((clause) =>
        visitMatches(visit, clause),
      );
    }

    return valueMatches(visit[field as keyof VisitRow], condition);
  });
}

/**
 * Enough of `where` for the report: equality, `in`, and instant bounds.
 *
 * Bounds compare parsed instants, so a row whose column is not a readable instant
 * fails every bound rather than passing them: `Number.NaN` is false against every
 * comparison, and a matcher that returned true on the strength of having found no
 * violated bound would answer "in the window" for a row that has no date at all.
 */
function valueMatches(value: unknown, condition: unknown): boolean {
  if (condition === null || condition === undefined) return value == null;

  if (typeof condition !== "object" || condition instanceof Date) {
    return value === condition;
  }

  const filter = condition as Record<string, unknown>;

  if ("in" in filter) return (filter.in as unknown[]).includes(value);

  // Both bounds have to hold. Returning on the first one would turn
  // `{ gte: start, lt: end }` into "everything since start", which is how a
  // window quietly grows into "all of history" without anything looking wrong.
  const at = instant(value);

  if ("gte" in filter && !(at >= instant(filter.gte))) return false;
  if ("gt" in filter && !(at > instant(filter.gt))) return false;
  if ("lt" in filter && !(at < instant(filter.lt))) return false;
  if ("lte" in filter && !(at <= instant(filter.lte))) return false;

  if (isBounded(filter)) return true;

  return value === condition;
}

/** An instant as a comparable number; NaN for anything that is not one. */
function instant(value: unknown): number {
  if (value instanceof Date) return value.getTime();

  const parsed = new Date(String(value)).getTime();

  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

function isBounded(filter: Record<string, unknown>): boolean {
  return (
    "gte" in filter || "gt" in filter || "lt" in filter || "lte" in filter
  );
}

