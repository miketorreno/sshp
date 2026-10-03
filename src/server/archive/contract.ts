/**
 * The internal browser contract for the archive: the domains it lists, what a
 * role needs to see each one, where each list is read from, and what a blocked
 * restore says.
 *
 * One place, because the archive screen is one screen and every list on it answers
 * the same two questions — may this role see these records, and what stands
 * between a reader and the restore they want.
 */

import { PERMISSIONS, type Permission } from "@/server/permissions";

/** The domains the clinic archives, one per archiveable record. */
export const ARCHIVE_SECTION_KEYS = [
  "patients",
  "appointments",
  "visits",
  "vitals",
  // Lab, imaging, and medication orders are three tables and one capability, so
  // they are one list behind the one permission that governs all three.
  "orders",
] as const;

export type ArchiveSectionKey = (typeof ARCHIVE_SECTION_KEYS)[number];

export type ArchiveSection = {
  key: ArchiveSectionKey;
  title: string;
  /** The permission a role needs before this domain's archived records are read. */
  archivePermission: Permission;
  /** The permission a role needs before it is offered this domain's Restore. */
  restorePermission: Permission;
};

export const ARCHIVE_SECTIONS = [
  {
    key: "patients",
    title: "Patients",
    archivePermission: PERMISSIONS.PATIENTS_ARCHIVE,
    restorePermission: PERMISSIONS.PATIENTS_RESTORE,
  },
  {
    key: "appointments",
    title: "Appointments",
    archivePermission: PERMISSIONS.APPOINTMENTS_ARCHIVE,
    restorePermission: PERMISSIONS.APPOINTMENTS_RESTORE,
  },
  {
    key: "visits",
    title: "Visits",
    archivePermission: PERMISSIONS.VISITS_ARCHIVE,
    restorePermission: PERMISSIONS.VISITS_RESTORE,
  },
  {
    key: "vitals",
    title: "Vitals",
    archivePermission: PERMISSIONS.VITALS_ARCHIVE,
    restorePermission: PERMISSIONS.VITALS_RESTORE,
  },
  {
    key: "orders",
    title: "Orders",
    archivePermission: PERMISSIONS.ORDERS_ARCHIVE,
    restorePermission: PERMISSIONS.ORDERS_RESTORE,
  },
] as const satisfies readonly ArchiveSection[];

/**
 * Every archive permission, which is what makes the archive reachable at all: the
 * screen is offered to a role that may archive something.
 */
export const ARCHIVE_PERMISSIONS: readonly Permission[] =
  ARCHIVE_SECTIONS.map((section) => section.archivePermission);

/**
 * How many archived records one page of a section holds.
 *
 * A page rather than a dump, because a clinic archives a great many vitals
 * records and the reader is looking for one. Same limit as the patient list, and
 * for the same reason: the point of the total is that the reader can see there are
 * more and go to them.
 */
export const ARCHIVE_PAGE_SIZE = 20;

export const DEFAULT_ARCHIVE_LIMIT = 20;
export const MAX_ARCHIVE_LIMIT = 100;

export type ArchiveListQuery = {
  page?: number;
  limit?: number;
};

export const archiveApiPaths = {
  list: (section: ArchiveSectionKey, query: ArchiveListQuery = {}) => {
    const params = new URLSearchParams();
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_ARCHIVE_LIMIT;

    params.set("page", String(page));
    params.set("limit", String(limit));

    return `/api/archive/${section}?${params.toString()}`;
  },
};

/**
 * The archived record standing between a reader and the restore they want.
 *
 * An archive unwinds from the top down, because an archived patient takes their
 * appointments, visits, and records with them and no read can reach any of them
 * until they are back. A restore refused for that reason names the record to
 * restore first, so the reader is not sent to try the same refused thing again.
 */
export type RestoreBlockedBy = {
  /** `Patient` for an archived patient, `Visit` for an archived visit. */
  recordType: "Patient" | "Visit";
  id: string;
  /** The patient's name, which is how the record standing in the way is named. */
  patientName: string;
};

/**
 * What to restore before the record in front of the reader can be, or `null` when
 * nothing is in the way.
 */
export function restoreBlockedCopy(
  blockedBy: RestoreBlockedBy | null,
): string | null {
  if (!blockedBy) return null;

  return blockedBy.recordType === "Patient"
    ? `Restore ${blockedBy.patientName}'s patient record first.`
    : `Restore ${blockedBy.patientName}'s visit first.`;
}