/**
 * The archive/restore event log as an in-memory table, shared by every domain
 * whose commands append to it. One implementation rather than three, because the
 * log is one table in the schema and a double that drifts from it is a double
 * that will report a bug the database does not have.
 *
 * It refuses to update or delete a row, mirroring the trigger the migration
 * installs, so a test cannot pass on a log the database would reject.
 */

export type EventRow = Record<string, unknown>;

/**
 * Loose enough to stand in wherever a domain's table type is expected: a double
 * that cannot be dropped into the store it belongs to is not shared.
 */
type Args = {
  where?: Record<string, unknown> | null;
  orderBy?: Record<string, "asc" | "desc">;
  skip?: number;
  take?: number;
};

export type EventTable = {
  findMany: (args?: Args) => Promise<EventRow[]>;
  findFirst: (args?: Args) => Promise<EventRow | null>;
  create: (args: { data: EventRow }) => Promise<EventRow>;
  update: (args: unknown) => Promise<never>;
  delete: (args: unknown) => Promise<never>;
};

export function makeEventTable(stored: EventRow[]): EventTable {
  return {
    findMany: async ({ where, orderBy, skip = 0, take } = {}) => {
      const found = stored
        .filter((row) => matches(row, where))
        .map((row) => ({ ...row }));

      for (const [field, direction] of Object.entries(orderBy ?? {})) {
        found.sort((left, right) =>
          compare(left[field], right[field], direction),
        );
      }

      return found.slice(skip, take === undefined ? undefined : skip + take);
    },
    findFirst: async ({ where } = {}) => {
      const found = stored.find((row) => matches(row, where));

      return found ? { ...found } : null;
    },
    create: async ({ data }) => {
      const created: EventRow = {
        id: `archive-event-${stored.length + 1}`,
        ...data,
      };

      stored.push(created);

      return { ...created };
    },
    update: async () => {
      throw new Error("archive events are append-only");
    },
    delete: async () => {
      throw new Error("archive events are append-only");
    },
  };
}

function matches(
  row: EventRow,
  where: Record<string, unknown> | null = {},
): boolean {
  return Object.entries(where ?? {}).every(([field, value]) => {
    const held = row[field];

    if (Array.isArray(held)) return held.some((entry) => entry === value);

    return held === value;
  });
}

function compare(left: unknown, right: unknown, direction: "asc" | "desc") {
  const order =
    left === right ? 0 : (left as never) < (right as never) ? -1 : 1;

  return direction === "asc" ? order : -order;
}
