/**
 * Who may do what, and the one place a read or a write asks.
 *
 * Every domain read requires a permission before it reaches the database, and
 * every write command asks for the permission its change needs. The matrix is
 * here rather than in the screens, because a permission enforced by the interface
 * is a permission a caller without the interface does not have: the reads and
 * writes are the boundary, so that is where the answer lives.
 *
 * The capability names come from `src/server/permissions.ts`, which decides
 * nothing and so can be bundled for a browser; this module reads the session, so
 * it cannot be. They are re-exported here because a read or a write reaches for
 * both from one module, and the boundary should not be two imports wide.
 */

import { Role } from "@/generated/prisma";
import { actionSuccess, type ActionResult } from "@/lib/action-result";
import {
  ForbiddenError,
  forbiddenFailure,
  getSession,
  requireSession,
  unauthenticatedFailure,
  type Session,
} from "@/lib/session";
import { EVERY_PERMISSION, PERMISSIONS } from "@/server/permissions";

export {
  PERMISSIONS,
  type Permission,
} from "@/server/permissions";

import type { Permission } from "@/server/permissions";

/**
 * The part of a session a permission is answered from: who the clinician is and
 * whether the account is still on. Both the boundary and the screens ask from
 * this, so the two cannot answer differently.
 */
export type SessionIdentity = {
  user: { role: string | null; isActive: boolean };
};

/**
 * Reading the clinical record: the patients, the day's appointments, the visits
 * and their orders, the pharmacy's catalogue, and the figures a report is built
 * from. A role either reads the whole clinical record or none of it, because a
 * partial read is the shape of a mistake waiting to happen — a clinician who can
 * see a visit but not the patient it belongs to has been shown half a story.
 */
const CLINICAL_READS = [
  PERMISSIONS.PATIENTS_READ,
  PERMISSIONS.VISITS_READ,
  PERMISSIONS.MEDICATIONS_READ,
  PERMISSIONS.REPORTS_READ,
  PERMISSIONS.APPOINTMENTS_READ,
] as const satisfies readonly Permission[];

/**
 * What a technician reads: the patient a visit belongs to and that visit with
 * the orders on it. One reading, so the two roles that read the same work hold
 * the same line here rather than two that look alike.
 */
const TECHNICIAN_READS = [
  PERMISSIONS.PATIENTS_READ,
  PERMISSIONS.VISITS_READ,
] as const satisfies readonly Permission[];

/**
 * What each role may do.
 *
 * - `ADMIN` and `SUPERUSER` run the clinic's configuration and its staff, so they
 *   hold every permission. They are also the only roles that may restore, because
 *   a restore reverses a lifecycle event and reverses an order a clinician made.
 * - `DOCTOR` treats patients: the whole clinical record to read, and the writes
 *   and archives a treating clinician makes.
 * - `NURSE` works inside a visit: vitals, the visit itself, and the appointment
 *   desk. Registration is not theirs, and neither is ordering.
 * - `RECEPTIONIST` runs the front desk: patients and appointments, and checking
 *   a patient in from an appointment. Opening a visit is a clinical act, so the
 *   walk-in check-in page is not theirs.
 * - `LAB_TECHNICIAN`, `IMAGING_TECHNICIAN`, and `PHARMACIST` read the work their
 *   department is handed. The commands that would make them write — results,
 *   completions, administrations — do not exist yet, so nothing is reserved for
 *   them here: when those commands arrive they ask for the permission they need,
 *   and the matrix is where the answer is decided.
 *
 * There is no `orders:read`, because nothing asks for one: orders are read as
 * part of the visit they belong to, so a role that may read a visit may read its
 * orders. A read of orders in its own right would be a new capability with a new
 * name, decided when there is a read to name it after.
 * - `PATIENT` is a patient account. There is no patient-facing surface in this
 *   app, so it holds nothing; the day there is one, it is a screen, not a
 *   widened grant on the staff matrix.
 * - `USER` is what a new account gets. It can look up a patient and see who is
 *   expected today, and it changes nothing: a clinical role is what turns an
 *   account into a clinician's.
 */
export const ROLE_PERMISSIONS = {
  ADMIN: EVERY_PERMISSION,
  SUPERUSER: EVERY_PERMISSION,

  DOCTOR: [
    ...CLINICAL_READS,
    PERMISSIONS.PATIENTS_WRITE,
    PERMISSIONS.PATIENTS_ARCHIVE,
    PERMISSIONS.APPOINTMENTS_WRITE,
    PERMISSIONS.APPOINTMENTS_ARCHIVE,
    PERMISSIONS.APPOINTMENTS_CHECK_IN,
    PERMISSIONS.VISITS_WRITE,
    PERMISSIONS.VISITS_ARCHIVE,
    PERMISSIONS.VITALS_WRITE,
    PERMISSIONS.VITALS_ARCHIVE,
    PERMISSIONS.ORDERS_WRITE,
    PERMISSIONS.ORDERS_ARCHIVE,
  ],

  NURSE: [
    ...CLINICAL_READS,
    PERMISSIONS.APPOINTMENTS_WRITE,
    PERMISSIONS.APPOINTMENTS_ARCHIVE,
    PERMISSIONS.APPOINTMENTS_CHECK_IN,
    PERMISSIONS.VISITS_WRITE,
    PERMISSIONS.VISITS_ARCHIVE,
    PERMISSIONS.VITALS_WRITE,
    PERMISSIONS.VITALS_ARCHIVE,
  ],

  RECEPTIONIST: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_WRITE,
    PERMISSIONS.PATIENTS_ARCHIVE,
    PERMISSIONS.APPOINTMENTS_READ,
    PERMISSIONS.APPOINTMENTS_WRITE,
    PERMISSIONS.APPOINTMENTS_ARCHIVE,
    PERMISSIONS.APPOINTMENTS_CHECK_IN,
    PERMISSIONS.VISITS_READ,
    PERMISSIONS.REPORTS_READ,
  ],

  LAB_TECHNICIAN: TECHNICIAN_READS,
  IMAGING_TECHNICIAN: TECHNICIAN_READS,

  PHARMACIST: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.VISITS_READ,
    PERMISSIONS.MEDICATIONS_READ,
  ],

  PATIENT: [],

  USER: [PERMISSIONS.PATIENTS_READ, PERMISSIONS.APPOINTMENTS_READ],
} as const satisfies Record<Role, readonly Permission[]>;

/**
 * Whether a role holds a permission.
 *
 * A role the matrix does not name holds nothing. The role arrives from the
 * session, so an account row that names a value the app does not know is a
 * question this has to answer with "no" rather than with a lookup that could
 * return something.
 *
 * `Object.hasOwn` rather than `in`, because `in` walks the prototype chain: an
 * account row holding the name of a built-in would otherwise be answered with
 * `Object.prototype`'s member, and asking that whether it holds a permission is
 * an exception rather than a refusal.
 */
export function can(
  role: string | null | undefined,
  permission: Permission,
): boolean {
  const permissions = permissionsFor(role);

  return permissions !== null && permissions.includes(permission);
}

/**
 * What the signed-in clinician may do, as one list the screens ask of.
 *
 * The interface hides a control the boundary would refuse, and it may only hide
 * what the boundary refuses, so both answers come from here: the screens are
 * handed this list rather than a copy of the matrix, and a screen that hides
 * nothing shows nothing a read or a write would refuse. No session holds nothing
 * here exactly as it holds nothing at the boundary.
 *
 * A list of names rather than a function, because it crosses into the client
 * tree and has to survive the trip.
 */
export function permissionsOf(
  session: SessionIdentity | null,
): Permission[] {
  if (!session) return [];

  return EVERY_PERMISSION.filter((permission) => may(session, permission));
}

/**
 * The session a read needs, or a throw. A read route has nothing to report a
 * refusal with but a status, so it refuses by throwing the failure the shared
 * envelope already knows how to answer.
 */
export async function requirePermission(
  permission: Permission,
): Promise<Session> {
  const session = await requireSession();

  if (!may(session, permission)) throw new ForbiddenError();

  return session;
}

/**
 * The session a write needs, as a result rather than a throw. A command reports
 * its refusals to a form, so it is given one that reads the same way as every
 * other command result.
 */
export async function authorize(
  permission: Permission,
): Promise<ActionResult<Session>> {
  const session = await getSession();

  if (!session) return unauthenticatedFailure();
  if (!may(session, permission)) return forbiddenFailure();

  return actionSuccess(session);
}

/**
 * Whether the clinician behind a session holds a permission.
 *
 * A deactivated account holds nothing, whatever role it kept: turning the flag
 * off is how this app stops a leaver, so it stops every permission at once rather
 * than leaving the ones that happen to be listed. What an account can still sign
 * in to is not this question — the permissions are.
 */
function may(session: SessionIdentity, permission: Permission): boolean {
  return session.user.isActive === true && can(session.user.role, permission);
}

function permissionsFor(
  role: string | null | undefined,
): readonly Permission[] | null {
  if (role == null || !Object.hasOwn(ROLE_PERMISSIONS, role)) return null;

  return ROLE_PERMISSIONS[role as Role];
}
