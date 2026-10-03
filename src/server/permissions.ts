/**
 * What this app calls a capability.
 *
 * The names live here rather than beside the matrix that grants them, because the
 * screens need to ask about a capability and the matrix cannot be bundled for a
 * browser: `src/server/access.ts` reads the session, and a session is cookies.
 * A name decides nothing on its own — holding one is the matrix's answer, not this
 * module's — so the half a client component may import is the half with no policy
 * in it.
 *
 * The names are capabilities rather than roles, so adding a role is a row in the
 * matrix and adding a capability is a name here — never a new question asked
 * somewhere else.
 */

export const PERMISSIONS = {
  PATIENTS_READ: "patients:read",
  PATIENTS_WRITE: "patients:write",
  PATIENTS_ARCHIVE: "patients:archive",
  PATIENTS_RESTORE: "patients:restore",

  APPOINTMENTS_READ: "appointments:read",
  APPOINTMENTS_WRITE: "appointments:write",
  APPOINTMENTS_ARCHIVE: "appointments:archive",
  APPOINTMENTS_CHECK_IN: "appointments:checkIn",
  APPOINTMENTS_RESTORE: "appointments:restore",

  VISITS_READ: "visits:read",
  VISITS_WRITE: "visits:write",
  VISITS_ARCHIVE: "visits:archive",
  VISITS_RESTORE: "visits:restore",

  VITALS_WRITE: "vitals:write",
  VITALS_ARCHIVE: "vitals:archive",
  VITALS_RESTORE: "vitals:restore",

  ORDERS_WRITE: "orders:write",
  ORDERS_ARCHIVE: "orders:archive",
  ORDERS_RESTORE: "orders:restore",

  MEDICATIONS_READ: "medications:read",
  REPORTS_READ: "reports:read",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Every capability the app names, for a caller that has to consider all of them. */
export const EVERY_PERMISSION: readonly Permission[] =
  Object.values(PERMISSIONS);