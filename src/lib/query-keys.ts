import type { PatientListQuery } from "@/server/patients/contract";

/**
 * The query key registry every browser read shares. Keys include every filter
 * that changes a result, and each namespace exposes the prefixes a write
 * invalidates.
 */

export const queryKeys = {
  patients: {
    list: (query: PatientListQuery = {}) => ["patients", "list", query] as const,
    lists: () => ["patients", "list"] as const,
    detail: (patientId: string) =>
      ["patients", "detail", patientId] as const,
    admitted: () => ["patients", "admitted"] as const,
    search: (query: string) => ["patients", "search", query] as const,
    searches: () => ["patients", "search"] as const,
  },
} as const;
