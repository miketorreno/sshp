import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query-keys";
import { invalidateAppointmentWrites } from "@/client/appointments/queries";

describe("appointment write invalidation", () => {
  it("invalidates every appointment read a write affects, and nothing else", async () => {
    const queryClient = new QueryClient();

    const seeded: [readonly unknown[], string][] = [
      [queryKeys.appointments.list({ page: 1, limit: 20 }), "first page"],
      [queryKeys.appointments.list({ page: 2, limit: 20 }), "second page"],
      [queryKeys.appointments.detail("appointment-1"), "written appointment"],
      [queryKeys.appointments.detail("appointment-2"), "other appointment"],
      [queryKeys.patients.list({ page: 1, limit: 10 }), "a patient read"],
    ];

    for (const [key] of seeded) {
      queryClient.setQueryData(key, "cached");
    }

    await invalidateAppointmentWrites(queryClient, "appointment-1");

    const invalidated = seeded
      .filter(([key]) => queryClient.getQueryState(key)?.isInvalidated)
      .map(([, label]) => label);

    expect(invalidated).toEqual([
      "first page",
      "second page",
      "written appointment",
    ]);
  });
});
