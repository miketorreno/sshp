/**
 * How many pages a list of `totalCount` rows holds.
 *
 * Shared rather than written out per screen, because two copies of this
 * arithmetic is two places for them to disagree: a page whose controls said
 * "Page 2 of 3" while its list showed page 3's rows, or a list that clamped to a
 * different last page than its pager offered.
 *
 * At least one, even when there are no rows, because a reader looking at an empty
 * result is still on page 1 of one page.
 */
export function lastPageOf(totalCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}
