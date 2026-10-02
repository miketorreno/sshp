import type { Appointment, Patient, User, Visit } from "@/generated/prisma";
import { makeEventTable } from "@/server/archive-events/test-support/event-table";

/**
 * An in-memory stand-in for the appointment and visit tables. Tests seed
 * patients, providers, appointments and visits, then observe which appointments
 * a read returns, which are hidden after an archive, whether a check-in linked a
 * visit, and whether a write destroyed a row. They never assert on the queries a
 * module issues, so the module stays free to change how it asks the database.
 *
 * It understands only the query features the appointment module uses: equality,
 * case-insensitive `contains`, `not`, `in`, `AND`/`OR` groups, a to-one `is`
 * relation filter, the `gte`/`gt`/`lt` range and overlap of a window, `orderBy`,
 * `skip`, `take`,
 * `select`, and `include` of the `patient` and `provider` relations. The visit that a
 * check-in links is read from the visit table, exactly as the database joins it,
 * so the double cannot answer a question the database would not.
 */

type Row = Record<string, unknown>;
type Condition = Record<string, unknown> | null | undefined;
type Relation = { select?: Record<string, boolean> } | boolean;

type Table = {
  findMany: (args?: {
    where?: Condition;
    orderBy?: Record<string, "asc" | "desc">;
    skip?: number;
    take?: number;
    include?: Record<string, Relation>;
  }) => Promise<Row[]>;
  findFirst: (args: {
    where?: Condition;
    include?: Record<string, Relation>;
  }) => Promise<Row | null>;
  create: (args: { data: Row }) => Promise<Row>;
  update: (args: { where: { id: string }; data: Row }) => Promise<Row>;
  delete: (args: { where: { id: string } }) => Promise<Row>;
};

type Store = {
  appointment: Table;
  visit: Table;
  patient: Pick<Table, "findFirst">;
  archiveRestoreEvent: Table;
};

export type AppointmentTable = {
  prisma: Store & {
    /**
     * Runs a write unit the way the database does: every change inside it lands
     * together, and a failure inside it leaves no change behind.
     */
    $transaction: <T>(run: (tx: Store) => Promise<T>) => Promise<T>;
  };
  appointments: Row[];
  visits: Row[];
  patients: Row[];
  users: Row[];
  /** The archive/restore events written, in the order they were appended. */
  events: Row[];
  /** Ids a caller tried to delete. The appointment module must never fill this. */
  destroyed: string[];
  findAppointment: (id: string) => Row | undefined;
  findVisit: (id: string) => Row | undefined;
};

export function createAppointmentTable(
  seed: {
    patients?: Partial<Patient>[];
    users?: Partial<User>[];
    appointments?: Partial<Appointment>[];
    visits?: Partial<Visit>[];
  } = {},
): AppointmentTable {
  const patients: Row[] = (seed.patients ?? []).map((row) => ({ ...row }));
  const users: Row[] = (seed.users ?? []).map((row) => ({ ...row }));
  const appointments: Row[] = (seed.appointments ?? []).map((row) => ({
    ...row,
  }));
  const visits: Row[] = (seed.visits ?? []).map((row) => ({ ...row }));
  const archiveEvents: Row[] = [];
  const destroyed: string[] = [];
  const relations: Relations = { patients, users, visits };

  const store: Store = {
    appointment: {
      findMany: async ({ where, orderBy, skip = 0, take, include } = {}) => {
        const found = appointments.filter((row) =>
          matches(withRelations(row, relations), where),
        );

        for (const [field, direction] of Object.entries(orderBy ?? {})) {
          found.sort((left, right) =>
            compare(left[field], right[field], direction),
          );
        }

        return found
          .slice(skip, take === undefined ? undefined : skip + take)
          .map((row) => hydrateAppointment(row, include, relations));
      },
      findFirst: async ({ where, include }) => {
        const found = appointments.find((row) =>
          matches(withRelations(row, relations), where),
        );

        return found ? hydrateAppointment(found, include, relations) : null;
      },
      create: async ({ data }) => {
        const created: Row = {
          id: `appointment-${nextSerial(appointments, "appointment")}`,
          createdAt: new Date("2026-03-01T00:00:00.000Z"),
          updatedAt: new Date("2026-03-01T00:00:00.000Z"),
          deletedAt: null,
          ...data,
        };

        appointments.push(created);

        return { ...created };
      },
      update: async ({ where, data }) => {
        const row = appointments.find((candidate) => candidate.id === where.id);

        if (!row) {
          throw new Error(`no appointment ${where.id} to update`);
        }

        Object.assign(row, data, {
          updatedAt: new Date("2026-03-01T00:00:00.000Z"),
        });

        return { ...row };
      },
      delete: async ({ where }) => {
        const index = appointments.findIndex((row) => row.id === where.id);

        if (index === -1) {
          throw new Error(`no appointment ${where.id} to delete`);
        }

        destroyed.push(where.id);
        const [removed] = appointments.splice(index, 1);

        return { ...removed };
      },
    },
    visit: {
      findMany: async ({ where, orderBy, skip = 0, take } = {}) => {
        const found = visits.filter((row) => matches(row, where));

        for (const [field, direction] of Object.entries(orderBy ?? {})) {
          found.sort((left, right) =>
            compare(left[field], right[field], direction),
          );
        }

        return found
          .slice(skip, take === undefined ? undefined : skip + take)
          .map((row) => ({ ...row }));
      },
      findFirst: async ({ where }) => {
        const found = visits.find((row) => matches(row, where));

        return found ? { ...found } : null;
      },
      create: async ({ data }) => {
        const created: Row = {
          id: `visit-${nextSerial(visits, "visit")}`,
          startDateTime: new Date("2026-03-01T00:00:00.000Z"),
          createdAt: new Date("2026-03-01T00:00:00.000Z"),
          updatedAt: new Date("2026-03-01T00:00:00.000Z"),
          deletedAt: null,
          ...data,
        };

        requireUniqueAppointment(visits, created);
        visits.push(created);

        return { ...created };
      },
      update: async ({ where, data }) => {
        const row = visits.find((candidate) => candidate.id === where.id);

        if (!row) throw new Error(`no visit ${where.id} to update`);

        const updated = { ...row, ...data };
        requireUniqueAppointment(visits, updated);
        Object.assign(row, data, {
          updatedAt: new Date("2026-03-01T00:00:00.000Z"),
        });

        return { ...row };
      },
      delete: async ({ where }) => {
        const index = visits.findIndex((row) => row.id === where.id);

        if (index === -1) throw new Error(`no visit ${where.id} to delete`);

        destroyed.push(where.id);
        const [removed] = visits.splice(index, 1);

        return { ...removed };
      },
    },
    patient: {
      findFirst: async ({ where }) => {
        const found = patients.find((row) => matches(row, where));

        return found ? { ...found } : null;
      },
    },
    archiveRestoreEvent: makeEventTable(archiveEvents),
  };

  const snapshot = () =>
    [appointments, visits, archiveEvents].map((rows) => [
      ...rows.map((row) => ({ ...row })),
    ]);

  const restore = (before: Row[][]) => {
    const [storedAppointments, storedVisits, storedEvents] = before;

    appointments.splice(0, appointments.length, ...storedAppointments);
    visits.splice(0, visits.length, ...storedVisits);
    archiveEvents.splice(0, archiveEvents.length, ...storedEvents);
  };

  return {
    prisma: {
      ...store,
      $transaction: async (run) => {
        const before = snapshot();

        try {
          return await run(store);
        } catch (error) {
          restore(before);
          throw error;
        }
      },
    },
    appointments,
    visits,
    patients,
    users,
    events: archiveEvents,
    destroyed,
    findAppointment: (id) => appointments.find((row) => row.id === id),
    findVisit: (id) => visits.find((row) => row.id === id),
  };
}

type Relations = {
  patients: Row[];
  users: Row[];
  visits: Row[];
};

/**
 * Resolves every relation an appointment row owns, so a `where` clause can
 * cross into the patient or provider the way the database joins would.
 */
function withRelations(row: Row, { patients, users }: Relations): Row {
  return {
    ...row,
    patient: patients.find((patient) => patient.id === row.patientId) ?? null,
    provider: users.find((user) => user.id === row.providerId) ?? null,
  };
}

/** Resolves only the relations a read asked for, on the row it returns. */
function hydrateAppointment(
  row: Row,
  include: Record<string, Relation> | undefined,
  { patients, users }: Relations,
): Row {
  if (!include) return { ...row };

  const hydrated: Row = { ...row };

  if ("patient" in include) {
    hydrated.patient =
      patients.find((patient) => patient.id === row.patientId) ?? null;
  }

  if ("provider" in include) {
    hydrated.provider =
      users.find((user) => user.id === row.providerId) ?? null;
  }

  return hydrated;
}

const FILTER_KEYS = new Set([
  "contains",
  "not",
  "in",
  "mode",
  "notIn",
  "gte",
  "gt",
  "lt",
  "is",
]);

/**
 * `Visit.appointmentId` is unique in the database, so a second visit cannot claim
 * an appointment that a visit already claims. The double refuses the write the
 * way the database refuses it, so a command that relies on the index is tested
 * against the failure it would really get.
 */
function requireUniqueAppointment(rows: Row[], candidate: Row): void {
  const claimed = candidate.appointmentId;

  if (claimed == null) return;

  const taken = rows.some(
    (row) => row.id !== candidate.id && row.appointmentId === claimed,
  );

  if (taken) {
    throw new Error(
      `unique constraint failed: Visit.appointmentId already claims ${String(claimed)}`,
    );
  }
}

/** The lowest serial the table has not handed out yet for this row prefix. */
function nextSerial(rows: Row[], prefix: string): number {
  let serial = rows.length + 1;

  while (rows.some((row) => row.id === `${prefix}-${serial}`)) {
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

    // `AND` is how a read keeps the active rule and adds a search beside it,
    // rather than one replacing the other.
    if (field === "AND") {
      const clauses = (condition as Condition[]) ?? [];

      return clauses.every((clause) => matches(row, clause));
    }

    return matchesField(row[field], condition);
  });
}

function matchesField(value: unknown, condition: unknown): boolean {
  if (condition === null || condition === undefined) return value == null;

  if (isRecord(condition)) {
    // A to-one relation filter wrapped in `is`, which is how a search over the
    // patient an appointment belongs to is written.
    if (condition.is !== undefined) {
      return matchesField(value, condition.is);
    }

    if (condition.contains !== undefined) {
      return (
        String(value ?? "")
          .toLowerCase()
          .includes(String(condition.contains).toLowerCase()) === true
      );
    }

    if (condition.not !== undefined) return value !== condition.not;

    // A window. `gte`/`lt` is half-open, so consecutive windows neither drop a row
    // starting exactly on the boundary nor return one twice; `gt` is how an
    // overlap asks "did this end after the window opened?".
    if (
      condition.gte !== undefined ||
      condition.gt !== undefined ||
      condition.lt !== undefined
    ) {
      if (value == null) return false;

      const valueTime = time(value);

      if (condition.gte !== undefined && valueTime < time(condition.gte)) {
        return false;
      }

      if (condition.gt !== undefined && valueTime <= time(condition.gt)) {
        return false;
      }

      if (condition.lt !== undefined && valueTime >= time(condition.lt)) {
        return false;
      }

      return true;
    }

    if (condition.in !== undefined) {
      return (condition.in as unknown[]).includes(value);
    }

    // A condition over a relation the read included, such as the archived
    // patient an appointment would otherwise inherit.
    if (isRecord(value) && !hasFilterKey(condition)) {
      return matches(value, condition);
    }
  }

  return value === condition;
}

function hasFilterKey(condition: Record<string, unknown>): boolean {
  return Object.keys(condition).some((key) => FILTER_KEYS.has(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !(value instanceof Date)
  );
}

function compare(
  left: unknown,
  right: unknown,
  direction: "asc" | "desc",
): number {
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
