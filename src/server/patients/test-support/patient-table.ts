import type { Patient } from "@/generated/prisma";

/**
 * An in-memory stand-in for the patient table. Tests seed patients, then observe
 * which patients a read returns, which are hidden after an archive, and whether
 * a write destroyed a row. They never assert on the queries a module issues, so
 * the module stays free to change how it asks the database for patients.
 *
 * It understands only the query features the patient module uses: equality,
 * `OR`, case-insensitive `contains`, `not`, `in`, `orderBy`, `skip`, `take`,
 * and `select`.
 */

type Row = Record<string, unknown>;
type Condition = Record<string, unknown> | null | undefined;

export type PatientTable = {
  prisma: {
    patient: {
      findMany: (args: {
        where?: Condition;
        orderBy?: Record<string, "asc" | "desc">;
        skip?: number;
        take?: number;
        select?: Record<string, boolean>;
      }) => Promise<Row[]>;
      findFirst: (args: {
        where?: Condition;
        select?: Record<string, boolean>;
      }) => Promise<Row | null>;
      count: (args?: { where?: Condition }) => Promise<number>;
      create: (args: { data: Row }) => Promise<Row>;
      update: (args: { where: { id: string }; data: Row }) => Promise<Row>;
      delete: (args: { where: { id: string } }) => Promise<Row>;
    };
  };
  /** The rows the table currently holds, including archived ones. */
  rows: Row[];
  /** Ids a caller tried to delete. The patient module must never fill this. */
  destroyed: string[];
  find: (id: string) => Row | undefined;
};

export function createPatientTable(
  seed: Partial<Patient>[] = []
): PatientTable {
  const rows: Row[] = seed.map((patient) => ({ ...patient }));
  const destroyed: string[] = [];

  const table: PatientTable = {
    prisma: {
      patient: {
        findMany: async ({ where, orderBy, skip = 0, take, select }) => {
          const found = rows.filter((row) => matches(row, where));

          // Sorted back to front, so the field `orderBy` declares first is the one
          // that decides the final order — the way Prisma reads it, and the reason a
          // tiebreaker like `id` settles rows that share a `createdAt` instead of
          // being overridden by it.
          const keys = Object.entries(orderBy ?? {}).reverse();

          for (const [field, direction] of keys) {
            found.sort((left, right) =>
              compare(left[field], right[field], direction)
            );
          }

          return found
            .slice(skip, take === undefined ? undefined : skip + take)
            .map((row) => project(row, select));
        },
        // The count answers "how many match", which is a different question from
        // "which ones", so it is not derived from a page: a table with two
        // patients answers two however many rows a caller asked to see.
        count: async ({ where } = {}) => rows.filter((row) => matches(row, where))
          .length,
        findFirst: async ({ where, select }) => {
          const found = rows.find((row) => matches(row, where));

          return found ? project(found, select) : null;
        },
        create: async ({ data }) => {
          const serial = nextSerial(rows);
          const created: Row = {
            id: `patient-${serial}`,
            patientCode: `PAT-${String(serial).padStart(3, "0")}`,
            createdAt: new Date("2026-03-01T00:00:00.000Z"),
            updatedAt: new Date("2026-03-01T00:00:00.000Z"),
            deletedAt: null,
            ...data,
          };

          rows.push(created);

          return { ...created };
        },
        update: async ({ where, data }) => {
          const row = rows.find((candidate) => candidate.id === where.id);

          if (!row) throw new Error(`no patient ${where.id} to update`);

          Object.assign(row, data, {
            updatedAt: new Date("2026-03-01T00:00:00.000Z"),
          });

          return { ...row };
        },
        delete: async ({ where }) => {
          const index = rows.findIndex((row) => row.id === where.id);

          if (index === -1) throw new Error(`no patient ${where.id} to delete`);

          destroyed.push(where.id);
          const [removed] = rows.splice(index, 1);

          return { ...removed };
        },
      },
    },
    rows,
    destroyed,
    find: (id) => rows.find((row) => row.id === id),
  };

  return table;
}

/** The lowest patient number the table has not handed out yet. */
function nextSerial(rows: Row[]): number {
  let serial = rows.length + 1;

  while (rows.some((row) => row.id === `patient-${serial}`)) {
    serial += 1;
  }

  return serial;
}

function matches(row: Row, where: Condition): boolean {
  if (!where) return true;

  return Object.entries(where).every(([field, condition]) => {
    if (field === "OR") {
      const clauses = (condition as Condition[]) ?? [];

      return clauses.some((clause) => matches(row, clause));
    }

    return matchesField(row[field], condition);
  });
}

function matchesField(value: unknown, condition: unknown): boolean {
  if (condition === null || condition === undefined) return value == null;

  if (isFilter(condition)) {
    if (condition.contains !== undefined) {
      return (
        String(value ?? "")
          .toLowerCase()
          .includes(String(condition.contains).toLowerCase()) === true
      );
    }

    if (condition.not !== undefined) return value !== condition.not;

    if (condition.in !== undefined) {
      return (condition.in as unknown[]).includes(value);
    }

    // Instant bounds, compared as instants so a read asking "registered since
    // Monday, up to Friday" gets the same answer the database would. Every bound
    // has to hold: `{ gte: start, lt: end }` is a range, and checking only the
    // first bound would quietly admit everything after `start`, forever.
    if (condition.gte !== undefined && time(value) < time(condition.gte)) {
      return false;
    }
    if (condition.gt !== undefined && time(value) <= time(condition.gt)) {
      return false;
    }
    if (condition.lte !== undefined && time(value) > time(condition.lte)) {
      return false;
    }
    if (condition.lt !== undefined && time(value) >= time(condition.lt)) {
      return false;
    }

    if (isAnyBound(condition)) return true;
  }

  return value === condition;
}

function isAnyBound(condition: Record<string, unknown>): boolean {
  return (
    condition.gte !== undefined ||
    condition.gt !== undefined ||
    condition.lte !== undefined ||
    condition.lt !== undefined
  );
}

function isFilter(condition: unknown): condition is Record<string, unknown> {
  return (
    typeof condition === "object" &&
    condition !== null &&
    !(condition instanceof Date)
  );
}

function compare(left: unknown, right: unknown, direction: "asc" | "desc"): number {
  const leftTime = time(left);
  const rightTime = time(right);
  const order = leftTime === rightTime ? 0 : leftTime < rightTime ? -1 : 1;

  return direction === "desc" ? -order : order;
}

function time(value: unknown): number {
  if (value instanceof Date) return value.getTime();

  const parsed = new Date(String(value)).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
}

function project(row: Row, select: Record<string, boolean> | undefined): Row {
  if (!select) return { ...row };

  return Object.fromEntries(
    Object.entries(row).filter(([field]) => select[field])
  );
}
