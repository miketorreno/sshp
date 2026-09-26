/**
 * The internal browser contract for patient reads and writes: the paging a
 * list read accepts, where the read routes live, which server-rendered path a
 * patient write revalidates, and the failures the patient surface reports.
 */

import { FAILURE_CODES, type ActionFailure } from "@/lib/action-result";

export type PatientListQuery = {
  page?: number;
  limit?: number;
};

/** Every patient read and write reports these same two failures. */
export const PATIENT_NOT_FOUND: ActionFailure = {
  code: FAILURE_CODES.NOT_FOUND,
  message: "Patient not found",
};

export const PATIENT_EMAIL_TAKEN: ActionFailure = {
  code: FAILURE_CODES.CONFLICT,
  message: "A patient with that email is already registered.",
};

export const DEFAULT_LIST_LIMIT = 10;
export const MAX_LIST_LIMIT = 100;
export const SEARCH_LIMIT = 10;

export const patientApiPaths = {
  list: (query: PatientListQuery = {}) => {
    const params = new URLSearchParams();
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_LIST_LIMIT;

    params.set("page", String(page));
    params.set("limit", String(limit));

    return `/api/patients?${params.toString()}`;
  },
  search: (query: string) =>
    `/api/patients?query=${encodeURIComponent(query)}`,
  admitted: () => "/api/patients/admitted",
  detail: (id: string) => `/api/patients/${encodeURIComponent(id)}`,
};

/** The page that renders the patient list, revalidated after any patient write. */
export const PATIENT_LIST_PAGE = "/patients/all";
