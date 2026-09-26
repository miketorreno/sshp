/**
 * The clinic day. A day is a calendar day in the ambient zone: the browser's own
 * zone for a staff member sitting in the clinic, and the server's zone for a
 * read. Settling one zone for the whole repository is deferred to the calendar
 * work (#28), so these helpers stay where each caller already lives in its zone
 * rather than claiming a single one.
 *
 * Reads take a day as `YYYY-MM-DD` rather than an instant, so asking for a day
 * never depends on a timezone offset the caller had to compute. That makes one
 * rule for a day -- how it opens, how it closes, and what it looks like as text
 * -- the thing these helpers own, rather than each reader repeating it.
 */

/** The moment the current day opens. */
export function startOfToday(): Date {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** The day a moment falls on, as the `YYYY-MM-DD` a read names a window with. */
export function localDay(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * The moment a named day opens, or null when the text is not a day. A bound that
 * is not a `YYYY-MM-DD` day is dropped rather than guessed at, so a caller that
 * sends nonsense reads a wider window instead of a wrong one.
 */
export function startOfDay(day: string | undefined): Date | null {
  const parts = parseDay(day);

  if (!parts) return null;

  return new Date(parts.year, parts.month - 1, parts.day);
}

/**
 * The moment a day closes: midnight opening the next one. A window bounded by a
 * day therefore includes the whole of it, so a visit counts on the day it started
 * rather than the day it was checked out.
 */
export function endOfDay(day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
}

function parseDay(day: string | undefined) {
  if (!day) return null;

  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);

  if (!parsed) return null;

  const [, year, month, date] = parsed;
  const value = { year: Number(year), month: Number(month), day: Number(date) };

  return isRealDay(value) ? value : null;
}

/** `2026-02-31` is not a day, so it opens no window. */
function isRealDay({
  year,
  month,
  day,
}: {
  year: number;
  month: number;
  day: number;
}) {
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}
