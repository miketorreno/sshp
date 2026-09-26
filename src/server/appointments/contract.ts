/**
 * The internal browser contract for appointment reads and writes: the paging a
 * list read accepts, where the read routes live, which server-rendered paths an
 * appointment write revalidates, and the failures the appointment surface
 * reports.
 */

import { FAILURE_CODES, type ActionFailure } from "@/lib/action-result";

export type AppointmentListQuery = {
  page?: number;
  limit?: number;
};

/** Every appointment read and write reports these same three failures. */
export const APPOINTMENT_NOT_FOUND: ActionFailure = {
  code: FAILURE_CODES.NOT_FOUND,
  message: "Appointment not found",
};

export const APPOINTMENT_ALREADY_CHECKED_IN: ActionFailure = {
  code: FAILURE_CODES.CONFLICT,
  message: "This appointment has already been checked in.",
};

export const APPOINTMENT_PATIENT_NOT_FOUND: ActionFailure = {
  code: FAILURE_CODES.NOT_FOUND,
  message: "The selected patient is not an active patient.",
};

export const DEFAULT_LIST_LIMIT = 20;
export const MAX_LIST_LIMIT = 100;

/**
 * The calendar draws a month, not a page of the table, so it asks for a wider
 * window than a table page. It is a window and not the whole clinic: paging the
 * calendar properly is deferred with the rest of the calendar work.
 */
export const CALENDAR_LIST_LIMIT = MAX_LIST_LIMIT;

export const appointmentApiPaths = {
  list: (query: AppointmentListQuery = {}) => {
    const params = new URLSearchParams();
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_LIST_LIMIT;

    params.set("page", String(page));
    params.set("limit", String(limit));

    return `/api/appointments?${params.toString()}`;
  },
  detail: (id: string) => `/api/appointments/${encodeURIComponent(id)}`,
};

/** The server-rendered paths any appointment write revalidates. */
export const APPOINTMENT_LIST_PAGE = "/appointments/all";
export const APPOINTMENT_CALENDAR_PAGE = "/appointments/calendar";
