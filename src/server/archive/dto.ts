/**
 * The shapes the archive screen reads, and the mapping from a row to them.
 *
 * Shared because all five lists show the same three things: which record it was,
 * who it belongs to, and what has to be restored before it can be. A row that
 * cannot be restored yet says which ancestor to restore instead, rather than
 * leaving the reader to find out by being refused.
 */

import type { RestoreBlockedBy } from "@/server/archive/contract";

export type { RestoreBlockedBy };

/**
 * One page of archived records, and the whole of what was asked for.
 *
 * The count is here for the same reason the patient list reports one: a pager
 * that only knows the size of its own page has to guess whether a next page
 * exists, and it guesses wrong on the last page whenever the count is an exact
 * multiple of the page size.
 */
export type ArchivePage<T> = {
  rows: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};

/**
 * When a row was archived.
 *
 * Only an archived row reaches an archive list, so a null here means the row was no
 * longer archived by the time it was mapped. That is a fault to report rather than
 * a moment to invent, and the screen is better a broken page than a row claiming to
 * have been archived at a time nobody recorded.
 *
 * Shared because five archive lists would otherwise each reach for `deletedAt` and
 * each decide for itself what a missing one means.
 */
export function toArchivedAt(deletedAt: Date | null): string {
  if (!deletedAt) {
    throw new Error("archived record carries no archive moment");
  }

  return deletedAt.toISOString();
}

/** The patient a row belongs to, named the way the archive screen says it. */
export type ArchivedPatientRef = {
  id: string;
  name: string;
};

/**
 * The parts of a patient row the archive names, and nothing more.
 *
 * All three name parts are required and validated on write, so a row missing one
 * cannot exist and the name is a plain join.
 */
type PatientRow = {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
};

/**
 * A patient, named in full.
 *
 * One string rather than the three parts, because every use of it here is a
 * sentence — "Restore Ada Lovelace's visit first" — and a sentence assembled from
 * three nullable parts is a sentence with gaps in it.
 */
export function toPatientRef(patient: PatientRow): ArchivedPatientRef {
  return {
    id: patient.id,
    name: `${patient.firstName} ${patient.middleName} ${patient.lastName}`,
  };
}

/** The visit a record was taken during, as far as a restore is concerned. */
type VisitRow = { id: string; deletedAt: Date | null };

type ArchivedPatientRow = PatientRow & { deletedAt: Date | null };

/**
 * The archived record standing between a reader and the restore they want, or
 * `null` when the restore can go ahead.
 *
 * Outermost first. An archived patient takes their appointments, visits, and
 * records with them, and no read can reach any of them until the patient is back,
 * so naming the visit beneath an archived patient would point the reader at a
 * restore that changes nothing.
 */
export function restoreBlockedBy({
  patient,
  visit = null,
}: {
  patient: ArchivedPatientRow;
  visit?: VisitRow | null;
}): RestoreBlockedBy | null {
  if (patient.deletedAt) {
    return { recordType: "Patient", id: patient.id, patientName: name(patient) };
  }

  if (visit?.deletedAt) {
    return { recordType: "Visit", id: visit.id, patientName: name(patient) };
  }

  return null;
}

function name(patient: PatientRow): string {
  return toPatientRef(patient).name;
}