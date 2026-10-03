"use client";
import { Button } from "@/components/ui/button";
import { lastPageOf } from "@/lib/paging";

/**
 * Paging controls for a list read.
 *
 * Two sources of truth, and the component says which one it is using:
 *
 * - With a `totalCount`, the read told us how many rows there are. Paging is then
 *   arithmetic: the last page is one the numbers name exactly, and the reader is
 *   told which page they are on out of how many.
 * - Without one, the read told us only about the page in hand. "Next" is then an
 *   inference — a full page might be followed by another or might be the last —
 *   and the label says "Page N" rather than claiming a page count nobody knows.
 *
 * A reader can arrive past the last page in the second case, when the row count
 * is an exact multiple of the page size. The controls stay visible there, because
 * a pager that disappears on an empty page leaves the reader no way back.
 */
const Pagination = ({
  page,
  rowCount,
  pageSize,
  totalCount,
  onPageChange,
}: {
  page: number;
  rowCount: number;
  pageSize: number;
  /**
   * How many rows the whole read holds, when the read reports it. Omit it and the
   * pager falls back to inferring a next page from a full one.
   */
  totalCount?: number;
  onPageChange: (page: number) => void;
}) => {
  const lastPage =
    totalCount === undefined ? undefined : lastPageOf(totalCount, pageSize);

  const hasPrevious = page > 1;
  const hasNext =
    lastPage === undefined ? rowCount === pageSize : page < lastPage;

  // Nothing to go to and nothing to come back from: one page, or empty on the
  // first. Showing controls here would offer a page that does not exist.
  if (!hasPrevious && !hasNext) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-end gap-3 pt-4"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {lastPage === undefined
          ? `Page ${page}`
          : `Page ${page} of ${lastPage}`}
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasPrevious}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasNext}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
};

export default Pagination;
