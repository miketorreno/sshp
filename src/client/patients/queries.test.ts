import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query-keys";
import { invalidatePatientWrites } from "@/client/patients/queries";

describe("patient write invalidation", () => {
  it("invalidates every patient read a write affects, and nothing else", async () => {
    const queryClient = new QueryClient();

    const seeded: [readonly unknown[], string][] = [
      [queryKeys.patients.list({ page: 1, limit: 10 }), "first page"],
      [queryKeys.patients.list({ page: 2, limit: 10 }), "second page"],
      // A search is a page of the list with a term in it, so it is invalidated by
      // the same prefix as every other page — there is no separate search read to
      // forget.
      [queryKeys.patients.list({ page: 1, search: "ada" }), "search page"],
      [queryKeys.patients.admitted(), "admitted"],
      [queryKeys.patients.report("month"), "report"],
      [queryKeys.patients.detail("patient-1"), "written patient"],
      [queryKeys.patients.detail("patient-2"), "other patient"],
    ];

    for (const [key] of seeded) {
      queryClient.setQueryData(key, "cached");
    }

    await invalidatePatientWrites(queryClient, "patient-1");

    const invalidated = seeded
      .filter(([key]) => queryClient.getQueryState(key)?.isInvalidated)
      .map(([, label]) => label);

    expect(invalidated).toEqual([
      "first page",
      "second page",
      "search page",
      "admitted",
      "report",
      "written patient",
    ]);
  });
});