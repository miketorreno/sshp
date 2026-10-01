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
  /**
   * What someone typed to find an appointment: any part of the patient's name,
   * or the patient's code. Blank is not a filter, so an untouched box lists
   * everything rather than nothing.
   */
  search?: string;
  /**
   * The window the caller drew, as instants to hand to the read. Naming both
   * ends asks for that window rather than a page, which is how the calendar
   * reads. Leaving both unnamed asks for a page, which is how the table reads.
   */
  from?: string;
  to?: string;
};

/**
 * The span of days a windowed read covers: `from` is the first moment included,
 * `to` is the first moment after the last one.
 */
export type AppointmentWindow = {
  from: Date;
  to: Date;
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
 * The calendar used to ask the list read for a wider page instead of naming the
 * days it drew, which drew a month with a silent hole wherever the page ended.
 * It now names a window, so there is no calendar page size to choose here.
 */
export const appointmentApiPaths = {
  list: (query: AppointmentListQuery = {}) => {
    const params = new URLSearchParams();

    if (query.from !== undefined && query.to !== undefined) {
      params.set("from", query.from);
      params.set("to", query.to);

      return `/api/appointments?${params.toString()}`;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_LIST_LIMIT;

    params.set("page", String(page));
    params.set("limit", String(limit));

    // An untouched search is not sent at all, so it cannot arrive at the read as
    // a filter that matches nothing.
    if (query.search) params.set("search", query.search);

    return `/api/appointments?${params.toString()}`;
  },
  detail: (id: string) => `/api/appointments/${encodeURIComponent(id)}`,
};

/** The server-rendered paths any appointment write revalidates. */
export const APPOINTMENT_LIST_PAGE = "/appointments/all";
export const APPOINTMENT_CALENDAR_PAGE = "/appointments/calendar";
