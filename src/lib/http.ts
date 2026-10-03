import { NextResponse } from "next/server";
import {
  internalFailure,
  statusForFailure,
  type ActionFailure,
} from "@/lib/action-result";
import { ForbiddenError, UnauthenticatedError } from "@/lib/session";

/**
 * How read routes answer. Every route returns the same failure envelope with
 * the status that matches its code, and an unexpected error never reaches the
 * browser as raw text.
 */

export function jsonFailure(failure: ActionFailure): NextResponse {
  return NextResponse.json(
    { error: failure },
    { status: statusForFailure(failure.code) },
  );
}

/** Maps a rejected read onto the shared failure envelope. */
export function toFailureResponse(error: unknown): NextResponse {
  // The two refusals the boundary itself raises are answers, not accidents: a
  // caller with no session is told to sign in, and a caller whose role does not
  // hold the permission is told so. Both keep their own status, so neither is
  // reported as the server's fault or as a missing record.
  if (error instanceof UnauthenticatedError || error instanceof ForbiddenError) {
    return jsonFailure(error.failure);
  }

  console.error("Read failed:", error);

  const { error: failure } = internalFailure();

  return jsonFailure(failure);
}

/**
 * Reads an instant query parameter, ignoring anything unparseable.
 *
 * A parameter that cannot be read as a moment is ignored rather than guessed
 * at, so a caller that names a window it got wrong is told so by the read that
 * has to honour it, not silently handed something else.
 */
export function toInstantParam(
  params: URLSearchParams,
  name: string,
): Date | undefined {
  const value = params.get(name);

  if (value === null) return undefined;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/** Reads an integer query parameter, ignoring anything unparseable. */
export function toIntegerParam(
  params: URLSearchParams,
  name: string,
): number | undefined {
  const value = params.get(name);

  if (value === null) return undefined;

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? undefined : parsed;
}
