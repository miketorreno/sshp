import { describe, expect, it } from "vitest";
import { lastPageOf } from "@/lib/paging";

describe("lastPageOf", () => {
  it("counts the pages a whole number of rows fills, and no page past it", () => {
    // 20 rows in pages of 20 is one page. A reader who has to click Next to find
    // out there is nothing after it has been told a page count that lies.
    expect(lastPageOf(20, 20)).toBe(1);
    expect(lastPageOf(21, 20)).toBe(2);
    expect(lastPageOf(40, 20)).toBe(2);
    expect(lastPageOf(41, 20)).toBe(3);
  });

  it("is one page for an empty read, because the reader is still on a page", () => {
    expect(lastPageOf(0, 20)).toBe(1);
  });

  it("rounds a partial page up rather than dropping the rows on it", () => {
    expect(lastPageOf(7, 3)).toBe(3);
  });
});
