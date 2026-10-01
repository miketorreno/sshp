import { headers } from "next/headers";
import { getAuth, type Auth } from "@/lib/auth";
import {
  FAILURE_CODES,
  FAILURE_MESSAGES,
  knownFailure,
  type ActionFailure,
  type ActionFailureResult,
} from "@/lib/action-result";

/**
 * The authentication boundary for every domain read and write. A session is read
 * from the request's cookies, so the same session works inside route handlers
 * and server actions.
 *
 * The session also carries who the clinician is — their role and whether the
 * account is active — because that is what `src/server/access.ts` asks before it
 * lets a read or a write proceed.
 */

export type Session = NonNullable<
  Awaited<ReturnType<Auth["api"]["getSession"]>>
>;

/**
 * How a client control names the signed-in clinician, and no more of the account
 * than it needs. A server component that passes the user to a client control
 * narrows the session to this.
 */
export type SessionUser = Pick<Session["user"], "name" | "email" | "image">;

export const UNAUTHENTICATED_FAILURE: ActionFailure = {
  code: FAILURE_CODES.UNAUTHENTICATED,
  message: FAILURE_MESSAGES.UNAUTHENTICATED,
};

/**
 * The refusal for a clinician whose role does not hold the permission the call
 * needs. It is a different failure from the unauthenticated one on purpose: the
 * caller is known, so answering "sign in" would send a signed-in clinician to the
 * sign-in page and tell them nothing about why the work was refused.
 */
export const FORBIDDEN_FAILURE: ActionFailure = {
  code: FAILURE_CODES.FORBIDDEN,
  message: FAILURE_MESSAGES.FORBIDDEN,
};

export class UnauthenticatedError extends Error {
  readonly failure: ActionFailure = UNAUTHENTICATED_FAILURE;

  constructor() {
    super(UNAUTHENTICATED_FAILURE.message);
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends Error {
  readonly failure: ActionFailure = FORBIDDEN_FAILURE;

  constructor() {
    super(FORBIDDEN_FAILURE.message);
    this.name = "ForbiddenError";
  }
}

/**
 * The request's headers are read before the auth system is asked for, because
 * there is no session to read without them: a request the framework refuses to
 * serve because it has no request scope is a request that must not reach for a
 * database, and a build collecting page data is exactly such a request.
 */
export async function getSession(): Promise<Session | null> {
  const requestHeaders = await headers();

  return getAuth().api.getSession({ headers: requestHeaders });
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    throw new UnauthenticatedError();
  }

  return session;
}

/** The same failure as a result, for commands that report instead of throw. */
export function unauthenticatedFailure(): ActionFailureResult {
  return knownFailure(UNAUTHENTICATED_FAILURE);
}

/** The same failure as a result, for commands refused by the role matrix. */
export function forbiddenFailure(): ActionFailureResult {
  return knownFailure(FORBIDDEN_FAILURE);
}
