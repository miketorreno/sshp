import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateAge,
  calculateAgeAt,
  clinicTimeZone,
  endOfDay,
  formatClinicDate,
  formatClinicDateTime,
  formatClinicTime,
  instantFromWallClock,
  InvalidTimeZoneError,
  startOfDay,
  toDateInputValue,
  toDateTimeLocalValue,
  today,
} from "@/lib/clinic-time";

/**
 * The clinic's clock is the one place that decides what a wall clock means, so
 * these tests fix the rule rather than any one screen's rendering: a clinic in
 * its own zone reads back the time its staff typed, and the same deployment read
 * from another zone still agrees.
 *
 * The zone is an argument here rather than something set on the environment, so
 * each case names the zone it is about instead of arranging for it. That is also
 * how the clock is called for real: `clinicTimeZone()` is the single function that
 * reads `process.env`, it is server-only, and a client component is handed the zone
 * by the tree it renders in. A function that quietly read the environment would
 * answer "UTC" in a browser, where the variable does not exist, and every one of
 * these cases would still pass — which is why the clock takes the zone instead of
 * finding it.
 */

const MANILA = "Asia/Manila";
const NEW_YORK = "America/New_York";
const UTC = "UTC";

describe("clinic time zone", () => {
  afterEach(() => {
    delete process.env.CLINIC_TIME_ZONE;
  });

  it("defaults to UTC so an unconfigured deployment is still consistent", () => {
    delete process.env.CLINIC_TIME_ZONE;

    expect(clinicTimeZone()).toBe("UTC");
  });

  it("names the zone it was configured with", () => {
    process.env.CLINIC_TIME_ZONE = MANILA;

    expect(clinicTimeZone()).toBe(MANILA);
  });

  it("names the variable when the zone is not a zone", () => {
    process.env.CLINIC_TIME_ZONE = "Manila-ish";

    expect(() => clinicTimeZone()).toThrow(InvalidTimeZoneError);
    expect(() => clinicTimeZone()).toThrow(/CLINIC_TIME_ZONE/);
  });
});

describe("a wall clock submitted by a form", () => {
  it("is the instant the clinic meant, not the server's reading of it", () => {
    // 09:00 in Manila is 01:00 UTC. Read as a server-local wall clock in any other
    // zone, this is the value that shifts.
    expect(instantFromWallClock("2026-03-02T09:00", MANILA)?.toISOString()).toBe(
      "2026-03-02T01:00:00.000Z",
    );
  });

  it("reads a wall clock with no time on it as the moment the day opens", () => {
    expect(instantFromWallClock("2026-03-02", MANILA)?.toISOString()).toBe(
      "2026-03-01T16:00:00.000Z",
    );
  });

  it("round-trips what a datetime-local input sends back", () => {
    const typed = "2026-03-02T09:00";
    const resolved = instantFromWallClock(typed, MANILA);

    expect(toDateTimeLocalValue(resolved!, MANILA)).toBe(typed);
  });

  it("accepts seconds and a space, because a form may send either", () => {
    expect(
      instantFromWallClock("2026-03-02 09:00:30", MANILA)?.toISOString(),
    ).toBe("2026-03-02T01:00:30.000Z");
  });

  it("is not a wall clock when the text is nonsense", () => {
    expect(instantFromWallClock("", MANILA)).toBeNull();
    expect(instantFromWallClock("tomorrow", MANILA)).toBeNull();
    expect(instantFromWallClock("02/03/2026", MANILA)).toBeNull();
    expect(instantFromWallClock("2026-13-02T09:00", MANILA)).toBeNull();
    expect(instantFromWallClock("2026-03-02T25:00", MANILA)).toBeNull();
  });

  it("is not a wall clock on a day the calendar does not have", () => {
    expect(instantFromWallClock("2026-02-31T09:00", UTC)).toBeNull();
  });

  it("is not a wall clock the zone skips on a daylight-saving morning", () => {
    // New York springs forward at 02:00 on 2026-03-08, so 02:30 that day never
    // happens. Resolving it anyway would silently move it to 03:30.
    expect(instantFromWallClock("2026-03-08T02:30", NEW_YORK)).toBeNull();

    // The hour before it still happens, at the old offset.
    expect(
      instantFromWallClock("2026-03-08T01:30", NEW_YORK)?.toISOString(),
    ).toBe("2026-03-08T06:30:00.000Z");
  });

  it("resolves the earlier of a wall clock the zone visits twice", () => {
    // Daylight saving ends at 02:00 on 2026-11-01, so 01:30 happens twice: once at
    // -04:00 and once at -05:00. The first is the one a clinician meant.
    expect(instantFromWallClock("2026-11-01T01:30", NEW_YORK)?.toISOString()).toBe(
      "2026-11-01T05:30:00.000Z",
    );
  });
});

describe("a clinic day", () => {
  it("names the day an instant falls on in the clinic zone", () => {
    const instant = new Date("2026-03-02T17:30:00.000Z");

    expect(toDateInputValue(instant, MANILA)).toBe("2026-03-03");
    expect(toDateInputValue(instant, UTC)).toBe("2026-03-02");
  });

  it("opens and closes so a window bounded by it covers the whole day", () => {
    const opens = startOfDay("2026-03-02", MANILA)!;
    const closes = endOfDay("2026-03-02", MANILA)!;

    expect(opens.toISOString()).toBe("2026-03-01T16:00:00.000Z");
    expect(closes.toISOString()).toBe("2026-03-02T16:00:00.000Z");
    expect(closes.getTime() - opens.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("opens the next day at the end of a month", () => {
    expect(endOfDay("2026-03-31", MANILA)?.toISOString()).toBe(
      "2026-03-31T16:00:00.000Z",
    );

    // February in a leap year, where 28 is not the last day.
    expect(endOfDay("2028-02-28", MANILA)?.toISOString()).toBe(
      "2028-02-28T16:00:00.000Z",
    );

    expect(endOfDay("2026-12-31", MANILA)?.toISOString()).toBe(
      "2026-12-31T16:00:00.000Z",
    );
  });

  it("follows the zone's own clock when daylight saving moves the day", () => {
    const springForward = startOfDay("2026-03-08", NEW_YORK)!;
    const closes = endOfDay("2026-03-08", NEW_YORK)!;

    // That day is 23 hours long, because the clinic lost an hour to DST.
    expect(closes.getTime() - springForward.getTime()).toBe(23 * 60 * 60 * 1000);
  });

  it("opens no window for a bound that is not a day", () => {
    expect(startOfDay(undefined, UTC)).toBeNull();
    expect(startOfDay("2026-03-02T09:00", UTC)).toBeNull();
    expect(endOfDay("2026-02-31", UTC)).toBeNull();
  });

  it("reads today in the clinic zone, not the server's", () => {
    const instant = new Date("2026-03-02T17:30:00.000Z");

    vi.useFakeTimers();
    vi.setSystemTime(instant);

    try {
      expect(today(MANILA)).toBe("2026-03-03");
      expect(today(UTC)).toBe("2026-03-02");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("a moment as staff read it", () => {
  const instant = new Date("2026-03-02T01:00:00.000Z");

  it("shows the clinic's clock, so 09:00 typed is 09:00 read", () => {
    expect(formatClinicTime(instant, MANILA)).toBe("09:00");
  });

  it("shows the same moment differently in another zone, without shifting the record", () => {
    expect(formatClinicTime(instant, NEW_YORK)).toBe("20:00");
    expect(formatClinicDateTime(instant, UTC)).toContain("Mar 02, 2026");
  });

  it("formats a date on its own", () => {
    expect(formatClinicDate(instant, UTC)).toBe("Mar 02, 2026");
  });

  it("gives a date input a day it can accept", () => {
    expect(toDateInputValue(instant, MANILA)).toBe("2026-03-02");
  });

  it("gives an empty input for a blank, rather than the epoch", () => {
    expect(toDateInputValue("", UTC)).toBe("");
    expect(toDateInputValue(null, UTC)).toBe("");
    expect(toDateTimeLocalValue(undefined, UTC)).toBe("");
  });

  it("reads nothing as nothing rather than as Invalid Date", () => {
    expect(formatClinicDateTime("not a date", UTC)).toBe("");
  });
});

describe("age", () => {
  const at = (iso: string, run: () => number) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));

    try {
      return run();
    } finally {
      vi.useRealTimers();
    }
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts whole years, and not the birthday that has not happened yet", () => {
    const born = new Date("2000-06-15T00:00:00.000Z");

    expect(at("2026-06-15T00:00:00.000Z", () => calculateAge(born, UTC))).toBe(
      26,
    );
    expect(
      at("2026-06-14T23:59:59.000Z", () => calculateAge(born, UTC)),
    ).toBe(25);
  });

  it("reads a birth date as the day it names, so a zone cannot shift it", () => {
    // A birth date is a day, not an instant. Stored at UTC midnight it reads as
    // the *previous* day anywhere west of UTC, and a New Year baby would be a year
    // younger on their birthday.
    const born = new Date("2000-01-01T00:00:00.000Z");

    expect(
      at("2026-01-01T12:00:00.000Z", () => calculateAge(born, NEW_YORK)),
    ).toBe(26);

    // And in a zone east of UTC it reads as the same day, still the right age.
    expect(
      at("2026-01-01T12:00:00.000Z", () => calculateAge(born, MANILA)),
    ).toBe(26);
  });

  it("is zero rather than a number of nonsense for a birth date that is none", () => {
    expect(calculateAge("not a date", UTC)).toBe(0);
  });

  describe("at a given moment", () => {
    const born = new Date("2000-06-15T00:00:00.000Z");

    it("ages against the moment asked for rather than the clock", () => {
      // Same birth date, same clinic: the report that says "as of the fifteenth"
      // must not re-band this patient when it is re-run tomorrow.
      expect(
        calculateAgeAt(born, UTC, new Date("2026-06-14T23:59:59.000Z")),
      ).toBe(25);
      expect(
        calculateAgeAt(born, UTC, new Date("2026-06-15T00:00:00.000Z")),
      ).toBe(26);
    });

    it("agrees with the clock-based age at the same moment", () => {
      expect(
        at("2026-06-15T00:00:00.000Z", () => calculateAge(born, UTC)),
      ).toBe(calculateAgeAt(born, UTC, new Date("2026-06-15T00:00:00.000Z")));
    });

    it("says it cannot rather than inventing an age it does not have", () => {
      // A caller that bands patients needs to tell "no age" from "zero years
      // old", which are different patients.
      expect(calculateAgeAt("not a date", UTC, new Date())).toBeNull();
      expect(
        calculateAgeAt(born, UTC, new Date("1990-01-01T00:00:00.000Z")),
      ).toBeNull();
    });
  });
});