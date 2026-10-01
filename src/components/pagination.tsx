"use client";
import { Button } from "@/components/ui/button";

/**
 * Paging controls for a list read.
 *
 * The list read answers with the rows it was asked for and nothing more, so this
 * knows there is another page only from a full page: a page with a row short of
 * the page size is the last page. A button that guesses wrong leaves the reader
 * on a page that exists rather than on one that does not.
 *
 * Which also means the reader can arrive *past* the last page: when the row count
 * is an exact multiple of the page size, the last page is full, so "Next" is
 * offered and the page after it is empty. Those controls stay visible, because a
 * pager that disappears on the empty page leaves the reader with no way back.
 */
const Pagination = ({
  page,
  rowCount,
  pageSize,
  onPageChange,
}: {
  page: number;
  rowCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) => {
  const hasPrevious = page > 1;
  const hasNext = rowCount === pageSize;

  // Nothing to go to and nothing to come back from: the list is one page, or is
  // empty on the first page. Showing controls here would offer a page that does
  // not exist.
  if (!hasPrevious && !hasNext) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-end gap-3 pt-4"
    >
      {/* The read reports the rows of this page and no total, so this reports
          the page it is on and never a page count it cannot know. */}
      <p className="text-sm text-muted-foreground">Page {page}</p>
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
