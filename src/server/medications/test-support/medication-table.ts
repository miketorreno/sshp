/**
 * An in-memory stand-in for the medication catalogue. Tests seed the
 * medications the pharmacy holds, then observe which ones a read returns. They
 * never assert on the queries a module issues, so the module stays free to change
 * how it asks the database.
 *
 * It understands only the query features the medication module uses: equality,
 * `orderBy`, and `select`.
 */

type Row = Record<string, unknown>;
type Condition = Record<string, unknown> | null | undefined;

export type MedicationTable = {
  prisma: {
    medication: {
      findMany: (args?: {
        where?: Condition;
        orderBy?: Record<string, "asc" | "desc">;
        select?: Record<string, boolean>;
      }) => Promise<Row[]>;
    };
  };
  medications: Row[];
  seed: (rows: Row[]) => void;
};

export function createMedicationTable(seed: Row[] = []): MedicationTable {
  const medications: Row[] = seed.map((row) => ({ ...row }));

  return {
    prisma: {
      medication: {
        findMany: async ({ where, orderBy, select } = {}) => {
          const found = medications.filter((row) => matches(row, where));

          for (const [field, direction] of Object.entries(orderBy ?? {})) {
            found.sort((left, right) =>
              compare(String(left[field] ?? ""), String(right[field] ?? ""), direction),
            );
          }

          return found.map((row) => (select ? project(row, select) : { ...row }));
        },
      },
    },
    medications,
    seed: (rows) => medications.splice(0, medications.length, ...rows.map((r) => ({ ...r }))),
  };
}

function matches(row: Row, where: Condition): boolean {
  if (!where) return true;

  return Object.entries(where).every(([field, condition]) =>
    condition === null || condition === undefined
      ? row[field] == null
      : row[field] === condition,
  );
}

function compare(left: string, right: string, direction: "asc" | "desc") {
  const order = left < right ? -1 : left > right ? 1 : 0;

  return direction === "desc" ? -order : order;
}

function project(row: Row, select: Record<string, boolean>): Row {
  return Object.fromEntries(
    Object.entries(row).filter(([field]) => select[field]),
  );
}
