"use client";
import {
  queryOptions,
  useQuery,
  type QueryClient,
} from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  patientApiPaths,
  type PatientListQuery,
} from "@/server/patients/contract";
import type {
  AdmittedPatientDto,
  PatientDetailDto,
  PatientSummaryDto,
} from "@/server/patients/dto";

/**
 * The browser read surface for patients. Screens ask for a read, never for a
 * transport, and a write invalidates exactly the reads it changed.
 */

export const patientQueries = {
  list: (query: PatientListQuery = {}) =>
    queryOptions({
      queryKey: queryKeys.patients.list(query),
      queryFn: () =>
        apiGet<PatientSummaryDto[]>(patientApiPaths.list(query)),
    }),
  search: (query: string) =>
    queryOptions({
      queryKey: queryKeys.patients.search(query),
      queryFn: () => apiGet<PatientSummaryDto[]>(patientApiPaths.search(query)),
      enabled: query.trim().length > 0,
    }),
  admitted: () =>
    queryOptions({
      queryKey: queryKeys.patients.admitted(),
      queryFn: () => apiGet<AdmittedPatientDto[]>(patientApiPaths.admitted()),
    }),
  detail: (patientId: string) =>
    queryOptions({
      queryKey: queryKeys.patients.detail(patientId),
      queryFn: () => apiGet<PatientDetailDto>(patientApiPaths.detail(patientId)),
    }),
};

export const usePatientList = (query: PatientListQuery = {}) =>
  useQuery(patientQueries.list(query));

export const usePatientSearch = (query: string) =>
  useQuery(patientQueries.search(query));

export const useAdmittedPatients = () => useQuery(patientQueries.admitted());

export const usePatientDetail = (patientId: string) =>
  useQuery(patientQueries.detail(patientId));

/**
 * A patient write can change any page of the list, every search result, the
 * admitted list, and the written patient's own detail read. Nothing else.
 */
export async function invalidatePatientWrites(
  queryClient: QueryClient,
  patientId: string
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.patients.lists() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.patients.searches() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.patients.admitted() }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.patients.detail(patientId),
    }),
  ]);
}
