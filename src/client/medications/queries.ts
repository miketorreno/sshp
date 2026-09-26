"use client";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { medicationApiPaths } from "@/server/medications/contract";
import type { MedicationSummaryDto } from "@/server/medications/dto";

/**
 * The browser read surface for the pharmacy's catalogue. A medication request
 * names a medication from it, so the list is read once and shared by every
 * request form rather than fetched per visit.
 */

export const medicationQueries = {
  list: () =>
    queryOptions({
      queryKey: queryKeys.medications.list(),
      queryFn: () =>
        apiGet<MedicationSummaryDto[]>(medicationApiPaths.list()),
    }),
};

export const useMedications = () => useQuery(medicationQueries.list());
