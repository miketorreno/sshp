"use client";

/**
 * What the signed-in clinician may do, for a component that renders in the
 * browser.
 *
 * A client component cannot ask `src/server/access.ts` — that module reads the
 * session from cookies — so the authenticated app layout asks on the server and
 * hands the answer down through this context. The screens are therefore told
 * what to render by the one matrix the boundary asks, rather than each holding a
 * second copy of it that can drift.
 *
 * The interface is not where a permission is enforced: the reads and writes are,
 * and this context exists so the two agree. It hides a control the boundary would
 * refuse, so a clinician is not offered work that will be turned down; when the
 * two ever disagree, the boundary is right and the screen is the bug.
 */

import { createContext, useContext, useMemo } from "react";
import type { Permission } from "@/server/permissions";

export type SessionPermissions = {
  /** The account's role, as the matrix names it, for a screen that says so. */
  role: string | null;
  /** Whether the clinician holds a permission, answered from the matrix. */
  can: (permission: Permission) => boolean;
};

/**
 * Nothing, for a screen rendered outside the provider.
 *
 * Refusing every permission rather than allowing every one, because the mistake
 * this context can make is showing a control that leads to a refusal, and a
 * missing control is the recoverable half of that.
 */
const NO_PERMISSIONS: SessionPermissions = {
  role: null,
  can: () => false,
};

const PermissionsContext = createContext<SessionPermissions>(NO_PERMISSIONS);

export const PermissionsProvider = ({
  role,
  permissions,
  children,
}: {
  role: string | null;
  permissions: readonly Permission[];
  children: React.ReactNode;
}) => {
  /**
   * Memoised on the list the server handed down, so the answer is computed once
   * per session rather than on every render of every screen under it.
   */
  const value = useMemo<SessionPermissions>(
    () => ({
      role,
      can: (permission) => permissions.includes(permission),
    }),
    [role, permissions],
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

/**
 * What the signed-in clinician may do, as `permissions.can(PERMISSIONS.X)`.
 *
 * Named `can` because that is the question a call site asks: a screen reads
 * `can(PERMISSIONS.PATIENTS_ARCHIVE)` and gets whether to offer the Archive
 * control, rather than comparing names or holding a role.
 */
export function usePermissions(): SessionPermissions {
  return useContext(PermissionsContext);
}