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
 * Role permissions are deliberately not modelled here: session presence is the
 * only authorization rule until a role matrix is decided.
 */

export type Session = NonNullable<
  Awaited<ReturnType<Auth["api"]["getSession"]>>
>;

/**
 * How a client control names the signed-in clinician, and no more of the account
 * than it needs to. A server component that passes the user to a client control
 * narrows the session to this.
 */
export type SessionUser = Pick<Session["user"], "name" | "email" | "image">;

export const UNAUTHENTICATED_FAILURE: ActionFailure = {
  code: FAILURE_CODES.UNAUTHENTICATED,
  message: FAILURE_MESSAGES.UNAUTHENTICATED,
};

export class UnauthenticatedError extends Error {
  readonly failure: ActionFailure = UNAUTHENTICATED_FAILURE;

  constructor() {
    super(UNAUTHENTICATED_FAILURE.message);
    this.name = "UnauthenticatedError";
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
