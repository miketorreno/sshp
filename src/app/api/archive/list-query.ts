import { toIntegerParam } from "@/lib/http";
import type { ArchiveListQuery } from "@/server/archive/contract";

/**
 * The page an archive list is asked for, read from a request's query string.
 *
 * Shared because there are five of these routes and the page they serve has to be
 * the same page: a limit read one way in the patients route and another in the
 * orders route would make the archive's pager disagree with itself.
 *
 * A parameter that cannot be read as a whole number is left out rather than
 * guessed at, and the read falls back to its first page — the same rule every other
 * read route follows.
 */
export function archiveListQuery(
  params: URLSearchParams,
): ArchiveListQuery {
  return {
    page: toIntegerParam(params, "page"),
    limit: toIntegerParam(params, "limit"),
  };
}