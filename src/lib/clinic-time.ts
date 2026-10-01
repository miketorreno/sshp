/**
 * The clinic's clock. One time zone owns every moment the app shows, submits,
 * or filters on, so a time never means one thing on one screen and another on
 * the next.
 *
 * The rule, in one line: **an instant is stored and transported in UTC, and a
 * wall clock is always the clinic's wall clock.** A clinician who types 09:00
 * means 09:00 at the clinic, reads 09:00 back, and sees an appointment they
 * scheduled for 09:00 sitting on the clinic's 09:00 — whether they are looking
 * at it in Manila or at a colleague in another zone.
 *
 * Two kinds of value cross this boundary, and they are not the same thing:
 *
 * - An **instant** is a point in time. It is what the database holds and what a
 *   read model sends as an ISO string. It has no zone of its own until someone
 *   renders it, and rendering it always names the clinic zone.
 * - A **wall clock** is what a person typed or reads: `2026-03-02T09:00`. It has
 *   no offset, so it is meaningless until it is resolved against the clinic zone.
 *   `datetime-local` inputs send this, which is why a submitted form has to be
 *   resolved here rather than by `Date`'s own parser, which would silently read
 *   it in the *server's* zone and shift every appointment by the difference
 *   between the server and the clinic.
 *
 * The zone is configuration (`CLINIC_TIME_ZONE`), not a constant, because a
 * clinic is somewhere specific. It defaults to UTC, which is also what the
 * container runs in, so an unconfigured deployment is still consistent — it just
 * displays UTC wall clocks rather than the clinic's.
 *
 * **Every conversion, comparison, and formatting function here takes the zone as
 * an argument, and none of them defaults it.** The two exceptions are the runtime
 * accessor `clinicTimeZone()`, which exists to be read server-side, and the schema
 * helper, which takes a thunk so that parsing — not module loading — is what reads
 * it. That is deliberate and load-bearing. `process.env` is not inlined into a
 * browser bundle unless a variable is prefixed `NEXT_PUBLIC_`, and doing that
 * would make the zone a *build* input — which ADR 0003 forbids, and which would
 * bake one clinic's offset into an image that another clinic then deploys. So a
 * function that quietly read `process.env` would compile, typecheck, and pass
 * every test while silently answering "UTC" in the browser, where the zone is
 * always absent. The zone is passed, not found, so a missing one is a type error
 * rather than a wrong hour on a patient chart.
 *
 * Server code reads the zone once with `clinicTimeZone()`. Client code receives
 * it from the server-rendered tree with `useClinicTimeZone()`, because only the
 * server can see the environment.
 */

import { z } from "zod";

const DEFAULT_TIME_ZONE = "UTC";

export class InvalidTimeZoneError extends Error {
  constructor(readonly zone: string) {
    super(
      `CLINIC_TIME_ZONE must be an IANA time zone such as "Asia/Manila" or ` +
        `"UTC", but it is "${zone}".`,
    );
    this.name = "InvalidTimeZoneError";
  }
}

/**
 * The zone the deployment is configured with.
 *
 * **Server only.** This reads `process.env`, which is `undefined` in a browser
 * bundle, so a client component that calls it renders UTC no matter how the
 * clinic is configured. Client components read the zone from the tree with
 * `useClinicTimeZone()` instead.
 *
 * Read at the moment something needs it rather than at module scope, for the
 * same reason the runtime environment is: `next build` imports every server
 * module, and a value read while a module loads is a value the builder demands.
 */
export function clinicTimeZone(): string {
  const zone = process.env.CLINIC_TIME_ZONE?.trim() || DEFAULT_TIME_ZONE;

  // An unusable zone would otherwise fail deep inside `Intl` with a diagnostic
  // that names a locale rather than the variable the operator set.
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(0);
  } catch {
    throw new InvalidTimeZoneError(zone);
  }

  return zone;
}

/** A moment's wall clock in a zone, as the parts a person reads. */
export type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/**
 * The wall clock an instant shows in `zone`. `Intl` is the only thing here that
 * knows about offsets and daylight saving, so the zone's rules are the zone's
 * rules rather than this file's arithmetic.
 */
export function wallClockOf(instant: Date, zone: string): WallClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

/**
 * The instant a wall clock names in `zone`, or null when the text is not one.
 *
 * The zone's offset depends on the moment, so the offset is discovered rather
 * than assumed: read the wall clock at a guess, correct the guess by the
 * difference, then check the answer still reads back as the same wall clock.
 * That check is what rejects a wall clock the zone skips — the hour that does
 * not exist on a daylight-saving morning — instead of silently moving it an
 * hour sideways.
 *
 * A wall clock the zone visits twice resolves to the first of the two, which is
 * the one a clinician reading a clock that day would mean.
 */
export function instantFromWallClock(
  wallClock: string,
  zone: string,
): Date | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(
      wallClock.trim(),
    );

  if (!match) return null;

  const [, year, month, day, hour = "0", minute = "0", second = "0"] = match;

  const wanted: WallClock = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  };

  if (!isRealWallClock(wanted)) return null;

  const naive = Date.UTC(
    wanted.year,
    wanted.month - 1,
    wanted.day,
    wanted.hour,
    wanted.minute,
    wanted.second,
  );

  let guess = naive;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const observed = wallClockOf(new Date(guess), zone);
    const next = naive - (observedAsUtc(observed) - guess);

    if (next === guess) break;

    guess = next;
  }

  const resolved = new Date(guess);

  // The zone never showed this wall clock, so there is no instant that reads
  // back as it. That is a wall clock nobody can act on, not a value to guess at.
  if (!isSameWallClock(wallClockOf(resolved, zone), wanted)) return null;

  return resolved;
}

/**
 * `2026-02-31` is not a day and `2026-13-02` is not a month, so neither names an
 * instant. `Date` would roll them into the next month instead of refusing them,
 * which is how a mistyped date becomes a real appointment on the wrong day.
 */
function isRealWallClock(clock: WallClock): boolean {
  const { year, month, day, hour, minute, second } = clock;

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;

  const normalized = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second),
  );

  return (
    normalized.getUTCFullYear() === year &&
    normalized.getUTCMonth() === month - 1 &&
    normalized.getUTCDate() === day
  );
}

/**
 * The moment a clinic day opens in `zone`, or null when the text is not a day.
 *
 * Stricter than `instantFromWallClock`, which also reads a clock: a window bound
 * is a *day*, and a caller that sends one with a time on it has made a mistake
 * this refuses to resolve on its behalf. A bound that is not a `YYYY-MM-DD` day
 * is dropped rather than guessed at, so a caller that sends nonsense reads a
 * wider window instead of a wrong one.
 */
export function startOfDay(
  day: string | undefined,
  zone: string,
): Date | null {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day.trim())) return null;

  return instantFromWallClock(day, zone);
}

/**
 * The moment a clinic day closes: midnight opening the next one. A window
 * bounded by a day therefore includes the whole of it, so a visit counts on the
 * day it started rather than the day it was checked out.
 */
export function endOfDay(day: string | undefined, zone: string): Date | null {
  const opens = startOfDay(day, zone);
  if (!opens) return null;

  return nextDayAfter(wallClockOf(opens, zone), zone);
}

/**
 * The instant the next clinic day opens. The day is rolled through the calendar
 * rather than by adding a day number, so the end of a month, of February, and of
 * a leap year each name the day that actually follows.
 */
function nextDayAfter(clock: WallClock, zone: string): Date | null {
  const next = new Date(
    Date.UTC(clock.year, clock.month - 1, clock.day + 1, clock.hour),
  );

  return instantFromWallClock(
    `${pad(next.getUTCFullYear(), 4)}-${pad(next.getUTCMonth() + 1)}-` +
      `${pad(next.getUTCDate())}T${pad(clock.hour)}:${pad(clock.minute)}` +
      `:${pad(clock.second)}`,
    zone,
  );
}

/**
 * The value a `datetime-local` input accepts: the clinic's wall clock.
 *
 * This is what makes an edit form round-trip. `datetime-local` will not accept the
 * `YYYY-MM-DD HH:mm` a plain `toLocaleString` produces, so a form defaulted from
 * one renders an *empty* input, and submitting it would erase the moment the
 * clinician never meant to touch.
 */
export function toDateTimeLocalValue(
  instant: Date | string | null | undefined,
  zone: string,
): string {
  if (instant == null || instant === "") return "";

  const date = toInstant(instant);
  if (!date) return "";

  const { year, month, day, hour, minute } = wallClockOf(date, zone);

  return `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

/**
 * The value a `date` input accepts: the clinic's day, with no time on it.
 *
 * A blank field is a blank field. `Date` would read `""` as the epoch and offer
 * a clinician a date from 1970 to clear.
 */
export function toDateInputValue(
  instant: Date | string | null | undefined,
  zone: string,
): string {
  if (instant == null || instant === "") return "";

  const date = toInstant(instant);
  if (!date) return "";

  const { year, month, day } = wallClockOf(date, zone);

  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/**
 * The clinic's today, as `YYYY-MM-DD` — how a read names the window it wants.
 *
 * In the clinic's zone rather than the reader's, because "today" is a fact about
 * where the clinic is. A clinician in another zone asking for today means the
 * clinic's today.
 */
export function today(zone: string): string {
  return toDateInputValue(new Date(), zone);
}

/** A moment as staff read it: the clinic's day and clock, to the minute. */
export function formatClinicDateTime(
  instant: Date | string,
  zone: string,
): string {
  return format(instant, zone, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

/** A moment as staff read its clock on its own. */
export function formatClinicTime(instant: Date | string, zone: string): string {
  return format(instant, zone, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

/** A moment as staff read its day on its own. */
export function formatClinicDate(instant: Date | string, zone: string): string {
  return format(instant, zone, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

/**
 * Whole years between a birth date and today, in the clinic's zone. A birthday
 * that has not happened yet this year has not made the person a year older.
 */
export function calculateAge(dateOfBirth: Date | string, zone: string): number {
  return calculateAgeAt(dateOfBirth, zone, new Date()) ?? 0;
}

/**
 * Whole years between a birth date and a given moment, in the clinic's zone.
 *
 * The moment is passed rather than read from the clock so a report can age
 * everyone against the instant it claims to be reporting on; read off the clock
 * instead, a report re-run tomorrow would band the same patients differently
 * while still calling the numbers the same.
 *
 * Off the calendar fields rather than by dividing elapsed milliseconds, so a leap
 * year cannot hand a patient a birthday a day early. A birth date that is none,
 * or one in the future, is null rather than a number: it means "we cannot say", and
 * inventing an age for it would be worse than admitting the gap.
 */
export function calculateAgeAt(
  dateOfBirth: Date | string,
  zone: string,
  on: Date,
): number | null {
  const born = toInstant(dateOfBirth);

  if (!born || born.getTime() > on.getTime()) return null;

  const birth = wallClockOf(born, zone);
  const now = wallClockOf(on, zone);

  const age = now.year - birth.year;

  return now.month < birth.month ||
    (now.month === birth.month && now.day < birth.day)
    ? age - 1
    : age;
}

/**
 * The instant a value names, or null when it names nothing. An ISO string with an
 * offset or `Z` is already an instant; anything else is left to the caller,
 * because a bare wall clock has no zone until one is given to it.
 */
function toInstant(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function format(
  instant: Date | string,
  zone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = toInstant(instant);
  if (!date) return "";

  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: zone,
  }).format(date);
}

/** The same wall clock as `Date.UTC` would build, which is how a guess is made. */
function observedAsUtc(clock: WallClock): number {
  return Date.UTC(
    clock.year,
    clock.month - 1,
    clock.day,
    clock.hour,
    clock.minute,
    clock.second,
  );
}

function isSameWallClock(left: WallClock, right: WallClock): boolean {
  return observedAsUtc(left) === observedAsUtc(right);
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

/**
 * The schema for a moment a clinician typed, resolved in the clinic's own zone.
 *
 * Lives beside the clock rather than in each domain's schema because it is the
 * same rule in both: `z.coerce.date()` would hand the text to `Date`, which reads
 * a bare `2026-03-02T09:00` as a *server-local* wall clock. A clinic not in the
 * server's zone would then store every appointment and visit shifted by the
 * difference, and the clinician who typed 09:00 would read back something else.
 *
 * `zod` is a peer of the clock's callers rather than of the clock itself, so the
 * schema is assembled here and takes the zone as a *thunk* — `clinicTimeZone`
 * itself. It is resolved when a value is parsed rather than when the schema is
 * built, because a schema built at module scope reads the environment while the
 * module loads, which ADR 0003 forbids, and it would bake in whatever zone
 * happened to be configured at import time rather than the one in force.
 */
export function clinicDateTimeSchema(zone: () => string) {
  return z.preprocess(
    (value) =>
      typeof value === "string" ? instantFromWallClock(value, zone()) : value,
    z.date({ error: "Enter a date and time" }),
  );
}
