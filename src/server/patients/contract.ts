/**
 * The internal browser contract for patient reads and writes: the paging a
 * list read accepts, where the read routes live, which server-rendered path a
 * patient write revalidates, and the failures the patient surface reports.
 */

import { FAILURE_CODES, type ActionFailure } from "@/lib/action-result";
import type { PatientType } from "@/generated/prisma";

export type PatientListQuery = {
  page?: number;
  limit?: number;
  /**
   * What someone typed to find a patient: any part of the first, middle, or last
   * name, their email, or their patient code. Reception reads patients by code as
   * often as by name, so all of them count. A blank term is not a filter, so an
   * untouched search box lists every active patient rather than none.
   *
   * Search narrows the list rather than replacing it: the same read pages
   * through the matches, so the total it reports is the number of matches and
   * not the size of the whole panel.
   */
  search?: string;
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

/** How many rows the patient list page asks for. A screen, not a dump. */
export const PATIENT_LIST_PAGE_SIZE = 20;

/**
 * The patient panel and the patient combobox once had two reads: a paged list
 * and a search that stopped after ten matches. There is now one read, so a
 * search is a filtered page of the list and the combobox asks it for a page it
 * names. The combobox only ever shows what fits in its dropdown, so its page is
 * as narrow as that.
 */
export const COMBOBOX_PAGE_SIZE = 8;

/**
 * How long a search box settles before the read fires.
 *
 * Named here rather than left as the hook's default, because it is part of what
 * this contract promises: a reader who types a name expects one read, not one per
 * keystroke, and only a number in the contract can be tested or changed with that
 * promise in mind.
 */
export const PATIENT_SEARCH_DEBOUNCE_MS = 300;

export const patientApiPaths = {
  list: (query: PatientListQuery = {}) => {
    const params = new URLSearchParams();
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_LIST_LIMIT;

    params.set("page", String(page));
    params.set("limit", String(limit));

    // An untouched search is not sent at all, so it cannot arrive at the read as
    // a filter that matches nothing.
    if (query.search) params.set("search", query.search);

    return `/api/patients?${params.toString()}`;
  },
  admitted: () => "/api/patients/admitted",
  detail: (id: string) => `/api/patients/${encodeURIComponent(id)}`,
  report: (period: PatientReportPeriod) =>
    `/api/patients/reports?period=${encodeURIComponent(period)}`,
};

/**
 * The server-rendered paths a patient write revalidates.
 *
 * Both of them, because every panel on the report moves when a patient is
 * registered or archived: the totals, the new and archived counts, and the
 * demographics are all derived from the same rows the write changed.
 */
export const PATIENT_PAGES = ["/patients/all", "/patients/reports"] as const;

/**
 * How far back a report reaches. A trailing window rather than a calendar one,
 * because "the last month" asked on the fifteenth means the thirty days behind
 * it, not a February that already ended — and a report whose window moves under
 * it as the days pass is a number nobody can reproduce.
 */
export const PATIENT_REPORT_PERIODS = [
  "week",
  "month",
  "quarter",
  "year",
] as const;

export type PatientReportPeriod = (typeof PATIENT_REPORT_PERIODS)[number];

const PERIOD_LENGTH_IN_DAYS = {
  week: 7,
  month: 30,
  quarter: 91,
  year: 365,
} as const satisfies Record<PatientReportPeriod, number>;

/** The trailing window a period names, as days. */
export function patientReportPeriodDays(
  period: PatientReportPeriod
): number {
  return PERIOD_LENGTH_IN_DAYS[period];
}

/**
 * The bands a patient's age falls into for a report.
 *
 * Every active patient lands in exactly one band, so the bands always add up to
 * the total the report gives. A patient whose birth date is unreadable is counted
 * in the band that means "we cannot say" rather than dropped, which keeps the
 * same promise.
 */
export const PATIENT_AGE_BANDS = [
  { key: "child", label: "0-17", from: 0, to: 17 },
  { key: "adult", label: "18-64", from: 18, to: 64 },
  { key: "senior", label: "65+", from: 65, to: Number.POSITIVE_INFINITY },
  { key: "unknown", label: "Unknown", from: -1, to: -1 },
] as const;

export type PatientAgeBandKey = (typeof PATIENT_AGE_BANDS)[number]["key"];

/** The patient types a report can break its panel down by. */
export const PATIENT_REPORT_TYPES = [
  "OUTPATIENT",
  "INPATIENT",
] as const satisfies readonly PatientType[];
