/**
 * The parts of an archived-record read that are the same whichever domain is
 * being read: what "archived" means to the database, how a list of archived
 * records is ordered, and how a page request becomes a skip and a take.
 *
 * Here rather than written out per domain, because five copies of the same
 * arithmetic is five places for the five lists to disagree about what page three
 * means.
 */

import {
  DEFAULT_ARCHIVE_LIMIT,
  MAX_ARCHIVE_LIMIT,
  type ArchiveListQuery,
} from "@/server/archive/contract";

/**
 * The clause that asks for the archived records and nothing else.
 *
 * The mirror image of each domain's active rule, and for the same reason: a
 * normal read cannot reach an archived record, so the archive asks for them the
 * other way round rather than reading everything and hiding the active rows in
 * the screen.
 */
export const ARCHIVED_RECORD = { deletedAt: { not: null } } as const;

/**
 * Most recently archived first, with the id as the tiebreaker.
 *
 * Records archived in the same transaction share a `deletedAt`, and a list sorted
 * only by it would leave those rows in whatever order the database returned them.
 * Page two of such a list could then repeat a row from page one and silently drop
 * another, which is why the id — which is never equal across rows — settles every
 * tie.
 */
export const MOST_RECENTLY_ARCHIVED = {
  deletedAt: "desc",
  id: "desc",
} as const;

/** The page a read serves, and the window of the table it reads. */
export type ArchivePageRequest = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

/**
 * The page a caller asked for, clamped to something the database can serve.
 *
 * A page below the first is the first, and a page size outside the range is the
 * nearest end of it, so a caller cannot ask for a window that starts before the
 * table or holds a thousand rows. A request that is not a number falls back to the
 * first page rather than passing `NaN` on: `skip: NaN` is a database error, and a
 * reader who typed something odd should still get a list.
 */
export function pageOf(query: ArchiveListQuery): ArchivePageRequest {
  const page = Math.max(1, wholeNumber(query.page, 1));
  const pageSize = Math.min(
    Math.max(wholeNumber(query.limit, DEFAULT_ARCHIVE_LIMIT), 1),
    MAX_ARCHIVE_LIMIT,
  );

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

function wholeNumber(value: number | undefined, fallback: number): number {
  if (value === undefined || Number.isNaN(value)) return fallback;

  return Math.trunc(value);
}