import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query-keys";
import { invalidateAppointmentWrites } from "@/client/appointments/queries";
import { appointmentApiPaths } from "@/server/appointments/contract";

describe("the appointment list path", () => {
  it("asks for the window it was given, so the calendar reads its days", () => {
    // The read refuses a window named halfway, so the path must name both ends
    // or not pretend to ask for one at all.
    expect(
      appointmentApiPaths.list({
        from: "2026-03-01T00:00:00.000Z",
        to: "2026-04-01T00:00:00.000Z",
      }),
    ).toBe(
      "/api/appointments?from=2026-03-01T00%3A00%3A00.000Z&to=2026-04-01T00%3A00%3A00.000Z",
    );
  });

  it("asks for a page when no window was given", () => {
    expect(appointmentApiPaths.list({ page: 2, limit: 5 })).toBe(
      "/api/appointments?page=2&limit=5",
    );
  });
});

describe("appointment write invalidation", () => {
  it("invalidates the calendar's windowed read as well as the table's pages", async () => {
    const queryClient = new QueryClient();
    const window = queryKeys.appointments.list({
      from: "2026-03-01T00:00:00.000Z",
      to: "2026-04-01T00:00:00.000Z",
    });

    queryClient.setQueryData(window, "cached");
    await invalidateAppointmentWrites(queryClient, "appointment-1");

    expect(queryClient.getQueryState(window)?.isInvalidated).toBe(true);
  });
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
