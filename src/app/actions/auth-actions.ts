"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAPIError } from "better-auth/api";
import { getAuth } from "@/lib/auth";
import {
  actionFailure,
  FAILURE_CODES,
  internalFailure,
  type ActionFailureResult,
} from "@/lib/action-result";
import { getSession, unauthenticatedFailure } from "@/lib/session";
import { MissingRuntimeConfigError } from "@/lib/runtime-env";

/**
 * The authentication exception to the domain rule that every command needs a
 * session. Signing up and signing in are how a session comes into existence, so
 * they are the only commands that run without one; signing out is the end of a
 * session and therefore needs one.
 *
 * Better Auth stays the authority on what a valid email, password, and account
 * are, so these commands do not restate its rules. They translate what it
 * rejects into the shared failure contract, so a form never renders the auth
 * library's wording or a database error.
 *
 * Every success here leaves for another page, so what these commands can report
 * back is always a refusal to show.
 */

const CLINIC_HOME = "/";
const LOGIN_PAGE = "/login";

/** The rejections that mean the email is already registered, by auth code. */
const EMAIL_REGISTERED = [
  "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
  "USER_ALREADY_EXISTS",
];

const CREDENTIALS_REJECTED: ActionFailureResult = actionFailure(
  FAILURE_CODES.INVALID_INPUT,
  { message: "That email and password do not match an account." }
);

const EMAIL_TAKEN: ActionFailureResult = actionFailure(
  FAILURE_CODES.CONFLICT,
  { message: "An account already exists for that email." }
);

export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<ActionFailureResult> {
  try {
    await getAuth().api.signUpEmail({
      body: { name, email, password, callbackURL: CLINIC_HOME },
    });
  } catch (error) {
    return signUpFailure(error);
  }

  redirect(CLINIC_HOME);
}

export async function signIn(
  email: string,
  password: string
): Promise<ActionFailureResult> {
  try {
    await getAuth().api.signInEmail({
      body: { email, password, callbackURL: CLINIC_HOME },
    });
  } catch (error) {
    return signInFailure(error);
  }

  redirect(CLINIC_HOME);
}

/**
 * Signing out ends the session the caller holds, so it reads the session from
 * the request, completes it, and only then leaves for the sign-in page. A
 * clinician whose sign-out fails stays where they are, with a session still
 * live, rather than being dropped on a page that cannot sign them back in.
 */
export async function signOut(): Promise<ActionFailureResult> {
  const session = await getSession();

  if (!session) return unauthenticatedFailure();

  try {
    await getAuth().api.signOut({ headers: await headers() });
  } catch (error) {
    console.error("Sign out failed:", error);

    return internalFailure();
  }

  redirect(LOGIN_PAGE);
}

/**
 * Keyed on the auth library's code rather than its status, because one status
 * covers more than one meaning: a sign-up it could not complete raises the same
 * unprocessable entity it raises for an email already in use, and telling the
 * clinician to pick another email would send them off fixing the wrong thing.
 */
function signUpFailure(error: unknown): ActionFailureResult {
  if (isAPIError(error) && EMAIL_REGISTERED.includes(error.body?.code ?? "")) {
    return EMAIL_TAKEN;
  }

  return refusalOrUnexpected(error, "Sign up");
}

/**
 * A refused sign-in has only one cause the clinician can act on. An
 * unauthorized status is therefore safe to read as bad credentials, which the
 * code is not: an unverified email is also unauthorized.
 */
function signInFailure(error: unknown): ActionFailureResult {
  if (isAPIError(error) && error.status === "UNAUTHORIZED") {
    return CREDENTIALS_REJECTED;
  }

  return refusalOrUnexpected(error, "Sign in");
}

/**
 * A rejection the auth library raises because the values sent are wrong is a
 * refusal the clinician can fix, and it says so with a bad request. Anything
 * else it reports is a failure it could not complete — a sign-up that created
 * no account, for one — which is ours to log rather than theirs to read as a
 * mistake of their own.
 */
function refusalOrUnexpected(
  error: unknown,
  command: string
): ActionFailureResult {
  if (isAPIError(error) && error.status === "BAD_REQUEST") {
    return actionFailure(FAILURE_CODES.INVALID_INPUT);
  }

  console.error(`${command} failed:`, error);

  // A deployment missing a runtime variable is not something the clinician can
  // fix by trying again, and a form that says only "something went wrong" sends
  // the operator to the log instead of to the variable. The message names
  // variables and never their values, so it is safe to report as it stands.
  if (error instanceof MissingRuntimeConfigError) {
    return actionFailure(FAILURE_CODES.FAILURE, { message: error.message });
  }

  return internalFailure();
}
