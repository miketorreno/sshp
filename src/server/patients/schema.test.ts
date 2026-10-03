import { describe, expect, it } from "vitest";

import { patientInputSchema } from "@/server/patients/schema";
import { withClinicTimeZone } from "@/lib/test-support/clinic-time";

/**
 * A date field that a clinician left blank and a date field they mistyped look
 * the same in a database column: both null. The only thing standing between a
 * mistyped `2026-02-31` and a silently forgotten date is this schema refusing to
 * let it through, so these are the cases where being lenient would be invisible
 * until someone read the record years later.
 */
describe("an optional patient date", () => {
  // Nairobi is UTC+3 and never observes DST, so a date resolved here differs from
  // the same wall clock resolved in UTC by a whole three hours — enough to move a
  // day. A zone that never shifts also keeps this test from having a second
  // expected answer to maintain.
  const withReferredDate = (referredDate: unknown) =>
    withClinicTimeZone("Africa/Nairobi", () =>
      patientInputSchema.safeParse({
        firstName: "Quincy",
        middleName: "Amara",
        lastName: "Okonkwo",
        dateOfBirth: "1990-01-01",
        gender: "Male",
        bloodGroup: "O+",
        email: "quincy@example.com",
        referredDate,
      }),
    );

  it.each([
    ["a blank field", ""],
    ["a field the form never sent", undefined],
  ])("records %s as not recorded", async (_case, value) => {
    const result = await withReferredDate(value);

    expect(result.success).toBe(true);
    expect(result.success && result.data.referredDate).toBeNull();
  });

  it.each(["2026-02-31", "not-a-date", "31/02/2026", "2026-13-01"])(
    "rejects %s rather than storing it as blank",
    async (value) => {
      const result = await withReferredDate(value);

      expect(result.success).toBe(false);
      expect(result.success === false && result.error.issues).toEqual([
        expect.objectContaining({
          path: ["referredDate"],
          message: "Enter a date",
        }),
      ]);
    },
  );

  it("resolves a real date in the clinic's zone, not the server's", async () => {
    const result = await withReferredDate("2026-02-28");

    expect(result.success).toBe(true);
    // Read as the same wall clock in UTC, this would be the following day's date.
    expect(result.success && result.data.referredDate?.toISOString()).toBe(
      "2026-02-27T21:00:00.000Z",
    );
  });
});