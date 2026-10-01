import type { AppointmentListQuery } from "@/server/appointments/contract";
import type {
  PatientListQuery,
  PatientReportPeriod,
} from "@/server/patients/contract";
import type { VisitListQuery } from "@/server/visits/contract";

/**
 * The query key registry every browser read shares. Keys include every filter
 * that changes a result, and each namespace exposes the prefixes a write
 * invalidates.
 */

export const queryKeys = {
  patients: {
    /**
     * One key per page *and* per search term. Search is a filter on the list read
     * rather than a read of its own, so its key is the list key with the term in
     * it: a search result is a page of the list, and the two can never disagree
     * about which patient a page holds.
     */
    list: (query: PatientListQuery = {}) =>
      ["patients", "list", query] as const,
    lists: () => ["patients", "list"] as const,
    detail: (patientId: string) => ["patients", "detail", patientId] as const,
    admitted: () => ["patients", "admitted"] as const,
    report: (period: PatientReportPeriod) =>
      ["patients", "report", period] as const,
    reports: () => ["patients", "report"] as const,
  },
  appointments: {
    list: (query: AppointmentListQuery = {}) =>
      ["appointments", "list", query] as const,
    lists: () => ["appointments", "list"] as const,
    detail: (appointmentId: string) =>
      ["appointments", "detail", appointmentId] as const,
  },
  visits: {
    list: (query: VisitListQuery = {}) => ["visits", "list", query] as const,
    lists: () => ["visits", "list"] as const,
    detail: (visitId: string) => ["visits", "detail", visitId] as const,
  },
  medications: {
    list: () => ["medications", "list"] as const,
  },
} as const;
