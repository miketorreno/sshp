"use client";
import {
  queryOptions,
  useQuery,
  type QueryClient,
} from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  appointmentApiPaths,
  type AppointmentListQuery,
} from "@/server/appointments/contract";
import type {
  AppointmentDetailDto,
  AppointmentSummaryDto,
} from "@/server/appointments/dto";

/**
 * The browser read surface for appointments. The list and the calendar ask for
 * the same list read, and a write invalidates exactly the reads it changed.
 */

export const appointmentQueries = {
  list: (query: AppointmentListQuery = {}) =>
    queryOptions({
      queryKey: queryKeys.appointments.list(query),
      queryFn: () =>
        apiGet<AppointmentSummaryDto[]>(appointmentApiPaths.list(query)),
    }),
  detail: (appointmentId: string) =>
    queryOptions({
      queryKey: queryKeys.appointments.detail(appointmentId),
      queryFn: () =>
        apiGet<AppointmentDetailDto>(appointmentApiPaths.detail(appointmentId)),
    }),
};

/**
 * The list read. `enabled` lets a caller that is still learning what it wants —
 * the calendar, which does not know its window until it has drawn a month —
 * hold the read until it can ask a real question.
 */
export const useAppointmentList = (
  query: AppointmentListQuery = {},
  options: { enabled?: boolean } = {},
) => useQuery({ ...appointmentQueries.list(query), enabled: options.enabled });

export const useAppointmentDetail = (appointmentId: string) =>
  useQuery(appointmentQueries.detail(appointmentId));

/**
 * An appointment write can change any page of the list, the calendar's events,
 * and the written appointment's own detail read. Nothing else.
 */
export async function invalidateAppointmentWrites(
  queryClient: QueryClient,
  appointmentId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.lists() }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.appointments.detail(appointmentId),
    }),
  ]);
}
