import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { invalidateArchiveWrites } from "@/client/archive/queries";
import { queryKeys } from "@/lib/query-keys";

describe("archive write invalidation", () => {
  it("forgets every section, because a restore unblocks the sections below it", async () => {
    const queryClient = new QueryClient();

    const seeded: [readonly unknown[], string][] = [
      [queryKeys.archive.section("patients", { page: 1, limit: 20 }), "patients"],
      [
        queryKeys.archive.section("visits", { page: 3, limit: 20 }),
        "visits, later page",
      ],
      // Restoring a visit takes its readings and orders with it out of the refusal
      // that says "restore the visit first", so those two sections change without
      // either of them being the row that was restored.
      [queryKeys.archive.section("vitals", { page: 1, limit: 20 }), "vitals"],
      [queryKeys.archive.section("orders", { page: 1, limit: 20 }), "orders"],
      [queryKeys.patients.list({ page: 1 }), "live patient list"],
    ];

    for (const [key] of seeded) {
      queryClient.setQueryData(key, "cached");
    }

    await invalidateArchiveWrites(queryClient);

    const invalidated = seeded
      .filter(([key]) => queryClient.getQueryState(key)?.isInvalidated)
      .map(([, label]) => label);

    expect(invalidated).toEqual([
      "patients",
      "visits, later page",
      "vitals",
      "orders",
    ]);
  });
});