"use client";
import {
  queryOptions,
  useQuery,
  type QueryClient,
} from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { visitApiPaths, type VisitListQuery } from "@/server/visits/contract";
import type { VisitDetailDto, VisitSummaryDto } from "@/server/visits/dto";

/**
 * The browser read surface for visits. Today's Outpatients and any other list
 * screen ask the same list read, and a visit write invalidates exactly the reads
 * it changed: the lists it may now appear in or disappear from, and its own
 * detail read.
 */

export const visitQueries = {
  list: (query: VisitListQuery = {}) =>
    queryOptions({
      queryKey: queryKeys.visits.list(query),
      queryFn: () => apiGet<VisitSummaryDto[]>(visitApiPaths.list(query)),
    }),
  detail: (visitId: string) =>
    queryOptions({
      queryKey: queryKeys.visits.detail(visitId),
      queryFn: () => apiGet<VisitDetailDto>(visitApiPaths.detail(visitId)),
    }),
};

export const useVisitList = (query: VisitListQuery = {}) =>
  useQuery(visitQueries.list(query));

export const useVisitDetail = (visitId: string) =>
  useQuery(visitQueries.detail(visitId));

/**
 * A visit write can change any page of the list and the written visit's own
 * detail read. Vitals live inside the visit's detail read, so recording or
 * archiving vitals invalidates that read too.
 */
export async function invalidateVisitWrites(
  queryClient: QueryClient,
  visitId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.visits.lists() }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.visits.detail(visitId),
    }),
  ]);
}
