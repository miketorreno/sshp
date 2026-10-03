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
  type PatientReportPeriod,
} from "@/server/patients/contract";
import type {
  AdmittedPatientDto,
  PatientDetailDto,
  PatientListDto,
} from "@/server/patients/dto";
import type { PatientReportDto } from "@/server/patients/report-dto";

/**
 * The browser read surface for patients. Screens ask for a read, never for a
 * transport, and a write invalidates exactly the reads it changed.
 *
 * Search is a filter on the list read rather than a read of its own, so there is
 * one list query and the search term travels in its key and its path. A screen
 * showing results therefore cannot be showing a different page of patients than
 * the one its own page count describes.
 */

export const patientQueries = {
  list: (query: PatientListQuery = {}) =>
    queryOptions({
      queryKey: queryKeys.patients.list(query),
      queryFn: ({ signal }) =>
        apiGet<PatientListDto>(patientApiPaths.list(query), { signal }),
    }),
  admitted: () =>
    queryOptions({
      queryKey: queryKeys.patients.admitted(),
      queryFn: ({ signal }) =>
        apiGet<AdmittedPatientDto[]>(patientApiPaths.admitted(), { signal }),
    }),
  detail: (patientId: string) =>
    queryOptions({
      queryKey: queryKeys.patients.detail(patientId),
      queryFn: ({ signal }) =>
        apiGet<PatientDetailDto>(patientApiPaths.detail(patientId), { signal }),
    }),
  report: (period: PatientReportPeriod) =>
    queryOptions({
      queryKey: queryKeys.patients.report(period),
      queryFn: ({ signal }) =>
        apiGet<PatientReportDto>(patientApiPaths.report(period), { signal }),
    }),
};

/**
 * The list read. `enabled` lets a caller that is not yet asking a question hold
 * the read back — the report, which waits on a period, and the combobox, which
 * waits on a first keystroke.
 *
 * The query function receives React Query's `AbortSignal` and passes it to the
 * request. Without it a screen that types quickly leaves a request per keystroke
 * in flight, and they arrive out of order: the reader watches results flicker
 * back to an earlier term. Cancelling the superseded read means only the newest
 * term can win.
 */
export const usePatientList = (
  query: PatientListQuery = {},
  options: { enabled?: boolean } = {},
) => useQuery({ ...patientQueries.list(query), enabled: options.enabled });

export const useAdmittedPatients = () => useQuery(patientQueries.admitted());

export const usePatientReport = (period: PatientReportPeriod) =>
  useQuery(patientQueries.report(period));

/**
 * One patient's detail read.
 *
 * An empty id names no patient, so the read stays off rather than asking for
 * `/api/patients/` and receiving a 404 — which is how a caller that has nothing
 * to look up yet avoids a failing request on every render.
 */
export const usePatientDetail = (patientId: string) =>
  useQuery({
    ...patientQueries.detail(patientId),
    enabled: patientId !== "",
  });

/**
 * A patient write can change any page of the list, every page of the report, the
 * admitted list, and the written patient's own detail read. Nothing else.
 */
export async function invalidatePatientWrites(
  queryClient: QueryClient,
  patientId: string
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.patients.lists() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.patients.admitted() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.patients.reports() }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.patients.detail(patientId),
    }),
  ]);
}
