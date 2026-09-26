/**
 * An in-memory stand-in for the visit table and the clinical records that hang
 * off it: vitals, orders, notes, diagnoses and procedures. Tests seed a clinic's
 * rows, then observe which visits a read returns, which records are hidden after
 * an archive, and whether a write destroyed a row. They never assert on the
 * queries a module issues, so the module stays free to change how it asks the
 * database.
 *
 * It understands only the query features the visit surface uses: equality, `in`,
 * date comparisons (`gte`, `lt`), `orderBy`, `skip`, `take`, `select`, and
 * `include` of a single record or a list of records, nested one level deep. A
 * record that belongs to another visit is joined the way the database joins it,
 * so the double cannot answer a question the database would not.
 */

type Row = Record<string, unknown>;
type Condition = Record<string, unknown> | null | undefined;
type Select = Record<string, boolean> | undefined;
type Include = Record<string, boolean | RelationQuery> | undefined;
type RelationQuery = {
  where?: Condition;
  orderBy?: Record<string, "asc" | "desc">;
  select?: Select;
  include?: Include;
};

type Args = {
  where?: Condition;
  orderBy?: Record<string, "asc" | "desc">;
  skip?: number;
  take?: number;
  select?: Select;
  include?: Include;
};

type Table = {
  findMany: (args?: Args) => Promise<Row[]>;
  findFirst: (args?: Args) => Promise<Row | null>;
  create: (args: { data: Row }) => Promise<Row>;
  update: (args: { where: { id: string }; data: Row }) => Promise<Row>;
  delete: (args: { where: { id: string } }) => Promise<Row>;
};

type Store = {
  visit: Table;
  vitals: Table;
  patient: Pick<Table, "findFirst">;
};

type Collections = {
  patients: Row[];
  users: Row[];
  medications: Row[];
  visits: Row[];
  vitals: Row[];
  labOrders: Row[];
  imagingOrders: Row[];
  medOrders: Row[];
  clinicalNotes: Row[];
  diagnoses: Row[];
  procedures: Row[];
};

export type VisitTable = {
  prisma: Store & {
    /**
     * Runs a write unit the way the database does: every change inside it lands
     * together, and a failure inside it leaves no change behind.
     */
    $transaction: <T>(run: (tx: Store) => Promise<T>) => Promise<T>;
  };
  visits: Row[];
  vitals: Row[];
  labOrders: Row[];
  imagingOrders: Row[];
  medOrders: Row[];
  clinicalNotes: Row[];
  diagnoses: Row[];
  procedures: Row[];
  patients: Row[];
  users: Row[];
  medications: Row[];
  /** Ids a caller tried to delete. The visit surface must never fill this. */
  destroyed: string[];
  findVisit: (id: string) => Row | undefined;
  findVitals: (id: string) => Row | undefined;
};

/** The child collections a visit owns, and the visit column that joins them. */
const VISIT_CHILDREN = {
  vitals: "vitals",
  labOrders: "labOrders",
  imagingOrders: "imagingOrders",
  medOrders: "medOrders",
  clinicalNotes: "clinicalNotes",
  diagnoses: "diagnoses",
  procedures: "procedures",
} as const;

/** The single-record relations a row can include, and the column that joins it. */
const RECORD_RELATIONS = {
  patient: { column: "patientId", collection: "patients" },
  provider: { column: "providerId", collection: "users" },
  createdBy: { column: "createdById", collection: "users" },
  updatedBy: { column: "updatedById", collection: "users" },
  recordedBy: { column: "recordedById", collection: "users" },
  orderedBy: { column: "orderedById", collection: "users" },
  author: { column: "authorId", collection: "users" },
  performedBy: { column: "performedById", collection: "users" },
  diagnosedBy: { column: "diagnosedById", collection: "users" },
  medication: { column: "medicationId", collection: "medications" },
  visit: { column: "visitId", collection: "visits" },
} as const satisfies Record<
  string,
  { column: string; collection: keyof Collections }
>;

/** The owner column a child row is joined on, so a list only holds its own rows. */
const CHILD_OWNER: Record<keyof typeof VISIT_CHILDREN, string> = {
  vitals: "visitId",
  labOrders: "visitId",
  imagingOrders: "visitId",
  medOrders: "visitId",
  clinicalNotes: "visitId",
  diagnoses: "visitId",
  procedures: "visitId",
};

export function createVisitTable(seed: Partial<Collections> = {}): VisitTable {
  const collections: Collections = {
    patients: rows(seed.patients),
    users: rows(seed.users),
    medications: rows(seed.medications),
    visits: rows(seed.visits),
    vitals: rows(seed.vitals),
    labOrders: rows(seed.labOrders),
    imagingOrders: rows(seed.imagingOrders),
    medOrders: rows(seed.medOrders),
    clinicalNotes: rows(seed.clinicalNotes),
    diagnoses: rows(seed.diagnoses),
    procedures: rows(seed.procedures),
  };
  const destroyed: string[] = [];

  const table = (name: keyof typeof VISIT_CHILDREN) =>
    makeTable(collections[name], `visit-${name}`, destroyed, () => collections);

  const store: Store = {
    visit: makeTable(collections.visits, "visit", destroyed, () => collections),
    vitals: table("vitals"),
    patient: {
      findFirst: async ({ where, select }: Args = {}) => {
        const found = collections.patients.find((row) => matches(row, where));

        return found ? hydrate(found, { include: undefined, select }) : null;
      },
    },
  };

  return {
    prisma: {
      ...store,
      $transaction: async (run) => {
        const before = snapshot(collections);

        try {
          return await run(store);
        } catch (error) {
          restore(collections, before);
          throw error;
        }
      },
    },
    ...collections,
    destroyed,
    findVisit: (id) => collections.visits.find((row) => row.id === id),
    findVitals: (id) => collections.vitals.find((row) => row.id === id),
  };
}

function makeTable(
  stored: Row[],
  idPrefix: string,
  destroyed: string[],
  collections: () => Collections,
): Table {
  return {
    findMany: async ({
      where,
      orderBy,
      skip = 0,
      take,
      select,
      include,
    } = {}) => {
      const found = stored
        .filter((row) => matches(withRecords(row, collections()), where))
        .map((row) =>
          hydrate(row, { select, include, collections: collections() }),
        );

      sort(found, orderBy);

      return found.slice(skip, take === undefined ? undefined : skip + take);
    },
    findFirst: async ({ where, select, include } = {}) => {
      const found = stored.find((row) =>
        matches(withRecords(row, collections()), where),
      );

      return found
        ? hydrate(found, { select, include, collections: collections() })
        : null;
    },
    create: async ({ data }) => {
      const created: Row = {
        id: `${idPrefix}-${nextSerial(stored, idPrefix)}`,
        startDateTime: new Date("2026-03-01T00:00:00.000Z"),
        recordedAt: new Date("2026-03-01T00:00:00.000Z"),
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-01T00:00:00.000Z"),
        deletedAt: null,
        ...data,
      };

      stored.push(created);

      return { ...created };
    },
    update: async ({ where, data }) => {
      const row = stored.find((candidate) => candidate.id === where.id);

      if (!row) throw new Error(`no ${idPrefix} ${where.id} to update`);

      Object.assign(row, data, {
        updatedAt: new Date("2026-03-01T00:00:00.000Z"),
      });

      return { ...row };
    },
    delete: async ({ where }) => {
      const index = stored.findIndex((row) => row.id === where.id);

      if (index === -1) throw new Error(`no ${idPrefix} ${where.id} to delete`);

      destroyed.push(where.id);
      const [removed] = stored.splice(index, 1);

      return { ...removed };
    },
  };
}

function rows(seed: Row[] | undefined): Row[] {
  return (seed ?? []).map((row) => ({ ...row }));
}

function snapshot(collections: Collections): Row[][] {
  return Object.values(collections).map((stored) =>
    stored.map((row) => ({ ...row })),
  );
}

function restore(collections: Collections, before: Row[][]): void {
  const names = Object.keys(collections) as (keyof Collections)[];

  names.forEach((name, index) => {
    collections[name].splice(0, collections[name].length, ...before[index]);
  });
}

/**
 * Resolves every single-record relation a row owns, so a `where` clause can cross
 * into a related record the way the database's join would.
 */
function withRecords(row: Row, collections: Collections): Row {
  const joined: Row = { ...row };

  for (const [name, { column, collection }] of Object.entries(
    RECORD_RELATIONS,
  )) {
    if (column in row) {
      joined[name] =
        collections[collection].find(
          (candidate) => candidate.id === row[column],
        ) ?? null;
    }
  }

  return joined;
}

function hydrate(
  row: Row,
  {
    select,
    include,
    collections,
  }: { select?: Select; include?: Include; collections?: Collections },
): Row {
  if (!include) return select ? project(row, select) : { ...row };

  const hydrated: Row = select ? project(row, select) : { ...row };

  for (const [name, query] of Object.entries(include)) {
    if (name in VISIT_CHILDREN) {
      hydrated[name] = children(
        row,
        name as keyof typeof VISIT_CHILDREN,
        query,
        collections,
      );
      continue;
    }

    const relation = RECORD_RELATIONS[name as keyof typeof RECORD_RELATIONS];

    if (!relation) continue;

    hydrated[name] =
      collections?.[relation.collection].find(
        (candidate) => candidate.id === row[relation.column],
      ) ?? null;
  }

  return hydrated;
}

function children(
  row: Row,
  name: keyof typeof VISIT_CHILDREN,
  query: boolean | RelationQuery,
  collections: Collections | undefined,
): Row[] {
  if (query === false) return [];
  if (!collections) return [];

  const { where, orderBy, select, include } = query as RelationQuery;
  const owner = CHILD_OWNER[name];
  const found = collections[VISIT_CHILDREN[name]]
    .filter((child) => child[owner] === row.id && matches(child, where))
    .map((child) => hydrate(child, { select, include, collections }));

  sort(found, orderBy);

  return found;
}

function sort(
  rows: Row[],
  orderBy: Record<string, "asc" | "desc"> | undefined,
) {
  for (const [field, direction] of Object.entries(orderBy ?? {})) {
    rows.sort((left, right) => compare(left[field], right[field], direction));
  }
}

/** The lowest serial the table has not handed out yet for this row prefix. */
function nextSerial(stored: Row[], prefix: string): number {
  let serial = stored.length + 1;

  while (stored.some((row) => row.id === `${prefix}-${serial}`)) {
    serial += 1;
  }

  return serial;
}

function matches(row: Row, where: Condition): boolean {
  if (!where) return true;

  return Object.entries(where).every(([field, condition]) =>
    matchesField(row[field], condition),
  );
}

function matchesField(value: unknown, condition: unknown): boolean {
  if (condition === null || condition === undefined) return value == null;

  if (isRecord(condition)) {
    // A range names both ends of the same comparison, so every bound has to
    // hold, the way a single SQL predicate does.
    if (hasRangeOperator(condition)) {
      return (
        (condition.gte === undefined ||
          compareDates(value, condition.gte) >= 0) &&
        (condition.gt === undefined || compareDates(value, condition.gt) > 0) &&
        (condition.lt === undefined || compareDates(value, condition.lt) < 0) &&
        (condition.lte === undefined || compareDates(value, condition.lte) <= 0)
      );
    }

    if (condition.in !== undefined) {
      return (condition.in as unknown[]).includes(value);
    }
    // A condition over a joined record, such as the archived patient a visit
    // would otherwise inherit.
    if (isRecord(value) && !hasOperator(condition)) {
      return matches(value, condition);
    }
  }

  return value === condition;
}

function hasOperator(condition: Record<string, unknown>): boolean {
  return ["in", "gte", "lt", "gt", "lte", "contains", "not"].some(
    (operator) => operator in condition,
  );
}

function hasRangeOperator(condition: Record<string, unknown>): boolean {
  return ["gte", "lt", "gt", "lte"].some(
    (operator) => condition[operator] !== undefined,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !(value instanceof Date) &&
    !Array.isArray(value)
  );
}

function compareDates(value: unknown, bound: unknown): number {
  const left = time(value);
  const right = time(bound);

  return left === right ? 0 : left < right ? -1 : 1;
}

function compare(
  left: unknown,
  right: unknown,
  direction: "asc" | "desc",
): number {
  const order = compareDates(left, right);

  return direction === "desc" ? -order : order;
}

function time(value: unknown): number {
  if (value instanceof Date) return value.getTime();

  const parsed = new Date(String(value)).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
}

function project(row: Row, select: Select): Row {
  if (!select) return { ...row };

  return Object.fromEntries(
    Object.entries(row).filter(([field]) => select[field]),
  );
}
