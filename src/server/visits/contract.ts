/**
 * The internal browser contract for visit reads and writes: the window and
 * filters a list read accepts, where the read routes live, which server-rendered
 * paths a visit write revalidates, and the failures the visit surface reports.
 */

import { FAILURE_CODES, type ActionFailure } from "@/lib/action-result";
import type { VisitType } from "@/generated/prisma";

/**
 * The window a list read covers, as calendar days rather than instants, so a
 * caller asks for "the second of March" instead of computing midnight itself.
 * Both bounds are inclusive.
 *
 * The days are read in the server's own zone, which is the zone the clinic day
 * has always been measured in. Settling one zone for the whole repository is
 * deliberately left to the calendar work, so this contract does not move that
 * decision; it only states which days it covers.
 */
export type VisitListQuery = {
  /** The first day of the window, as `YYYY-MM-DD`. */
  from?: string;
  /** The last day of the window, as `YYYY-MM-DD`. */
  to?: string;
  visitType?: VisitType;
  limit?: number;
};

export const VISIT_TYPES = [
  "CLINIC",
  "EMERGENCY",
  "FOLLOWUP",
  "IMAGING",
  "LAB",
  "PHARMACY",
] as const satisfies readonly VisitType[];

/** A list read is a clinic day, not an archive, so it is bounded. */
export const DEFAULT_LIST_LIMIT = 50;
export const MAX_LIST_LIMIT = 200;

/** Every visit read and write reports these failures. */
export const VISIT_NOT_FOUND: ActionFailure = {
  code: FAILURE_CODES.NOT_FOUND,
  message: "Visit not found",
};

export const VISIT_PATIENT_NOT_FOUND: ActionFailure = {
  code: FAILURE_CODES.NOT_FOUND,
  message: "The selected patient is not an active patient.",
};

/**
 * A checked-out visit is history: it still reads, and it no longer accepts a
 * clinical write or an archive.
 */
export const VISIT_CHECKED_OUT: ActionFailure = {
  code: FAILURE_CODES.CONFLICT,
  message: "This visit is checked out and no longer accepts changes.",
};

export const VISIT_ALREADY_CHECKED_OUT: ActionFailure = {
  code: FAILURE_CODES.CONFLICT,
  message: "This visit is already checked out.",
};

export const visitApiPaths = {
  list: (query: VisitListQuery = {}) => {
    const params = new URLSearchParams();

    for (const [name, value] of Object.entries({
      from: query.from,
      to: query.to,
      visitType: query.visitType,
      limit: query.limit,
    })) {
      if (value === undefined) continue;

      params.set(name, String(value));
    }

    return `/api/visits?${params.toString()}`;
  },
  detail: (id: string) => `/api/visits/${encodeURIComponent(id)}`,
};

/** The page Today's Outpatients renders, revalidated after any visit write. */
export const OUTPATIENTS_PAGE = "/patients/outpatients";

export const visitPage = (visitId: string) => `/visits/${visitId}`;
