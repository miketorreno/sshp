import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { medicationQueries } from "@/client/medications/queries";
import { invalidateVisitWrites } from "@/client/visits/queries";
import { queryKeys } from "@/lib/query-keys";
import { medicationApiPaths } from "@/server/medications/contract";

const CATALOGUE = [
  { id: "medication-1", name: "Amoxicillin", brandName: "Amoxil" },
  { id: "medication-2", name: "Insulin", brandName: null },
];

const catalogueResponse = () =>
  vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify(CATALOGUE), { status: 200 }));

describe("medication catalogue read", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the catalogue through its one read path", async () => {
    const fetchMock = catalogueResponse();

    await expect(
      new QueryClient().fetchQuery(medicationQueries.list()),
    ).resolves.toEqual(CATALOGUE);

    expect(fetchMock).toHaveBeenCalledWith(
      medicationApiPaths.list(),
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("serves every request form from one key, because it does not vary per visit", () => {
    expect(medicationQueries.list().queryKey).toEqual(
      queryKeys.medications.list(),
    );
  });

  it("survives a visit order write, because the catalogue is not what that write changes", async () => {
    const queryClient = new QueryClient();

    queryClient.setQueryData(queryKeys.medications.list(), CATALOGUE);
    queryClient.setQueryData(queryKeys.visits.detail("visit-1"), "cached");

    await invalidateVisitWrites(queryClient, "visit-1");

    expect(
      queryClient.getQueryState(queryKeys.medications.list())?.isInvalidated,
    ).toBeFalsy();
  });
});
