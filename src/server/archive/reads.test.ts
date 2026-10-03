import { describe, expect, it } from "vitest";
import {
  ARCHIVED_RECORD,
  MOST_RECENTLY_ARCHIVED,
  pageOf,
} from "@/server/archive/reads";
import { DEFAULT_ARCHIVE_LIMIT, MAX_ARCHIVE_LIMIT } from "@/server/archive/contract";

describe("what an archived record is", () => {
  it("asks for the archived rows and nothing else", () => {
    // The mirror image of each domain's active rule. A normal read cannot reach an
    // archived record, so the archive has to ask for them the other way round
    // rather than read everything and hide the active rows in the screen.
    expect(ARCHIVED_RECORD).toEqual({ deletedAt: { not: null } });
  });

  it("orders them most recently archived first, with the id settling a tie", () => {
    expect(MOST_RECENTLY_ARCHIVED).toEqual({ deletedAt: "desc", id: "desc" });
  });
});

describe("the page an archive list serves", () => {
  it("serves the first page of the default size when nothing is asked for", () => {
    expect(pageOf({})).toEqual({
      page: 1,
      pageSize: DEFAULT_ARCHIVE_LIMIT,
      skip: 0,
      take: DEFAULT_ARCHIVE_LIMIT,
    });
  });

  it("skips whole pages, so page three starts after the second", () => {
    expect(pageOf({ page: 3, limit: 20 })).toEqual({
      page: 3,
      pageSize: 20,
      skip: 40,
      take: 20,
    });
  });

  it("clamps a page below the first, and a page size outside the range", () => {
    expect(pageOf({ page: 0, limit: 0 }).page).toBe(1);
    expect(pageOf({ page: -4 }).skip).toBe(0);
    expect(pageOf({ limit: 10_000 }).pageSize).toBe(MAX_ARCHIVE_LIMIT);
    expect(pageOf({ limit: 2.7 }).pageSize).toBe(2);
  });

  it("falls back to the first page for a page that is not a number", () => {
    // A read reached directly rather than through a route can be handed anything,
    // and `skip: NaN` is a database error rather than a first page.
    expect(pageOf({ page: Number.NaN })).toEqual({
      page: 1,
      pageSize: DEFAULT_ARCHIVE_LIMIT,
      skip: 0,
      take: DEFAULT_ARCHIVE_LIMIT,
    });
    expect(pageOf({ limit: Number.NaN }).pageSize).toBe(DEFAULT_ARCHIVE_LIMIT);
  });
});