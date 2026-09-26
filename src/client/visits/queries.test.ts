import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { invalidateVisitWrites } from "@/client/visits/queries";
import { queryKeys } from "@/lib/query-keys";

describe("visit write invalidation", () => {
  it("invalidates every visit read a write affects, and nothing else", async () => {
    const queryClient = new QueryClient();
    const today = "2026-03-02";

    const seeded: [readonly unknown[], string][] = [
      [queryKeys.visits.list({ from: today, to: today }), "today's visits"],
      [queryKeys.visits.list({ visitType: "EMERGENCY" }), "a filtered list"],
      [queryKeys.visits.detail("visit-1"), "written visit"],
      [queryKeys.visits.detail("visit-2"), "other visit"],
      [queryKeys.patients.list({ page: 1, limit: 10 }), "a patient read"],
    ];

    for (const [key] of seeded) {
      queryClient.setQueryData(key, "cached");
    }

    await invalidateVisitWrites(queryClient, "visit-1");

    const invalidated = seeded
      .filter(([key]) => queryClient.getQueryState(key)?.isInvalidated)
      .map(([, label]) => label);

    expect(invalidated).toEqual([
      "today's visits",
      "a filtered list",
      "written visit",
    ]);
  });

  it("covers the vitals recorded inside a visit, because they share its detail read", async () => {
    const queryClient = new QueryClient();

    queryClient.setQueryData(queryKeys.visits.detail("visit-1"), "cached");

    await invalidateVisitWrites(queryClient, "visit-1");

    expect(
      queryClient.getQueryState(queryKeys.visits.detail("visit-1"))
        ?.isInvalidated,
    ).toBe(true);
  });
});
