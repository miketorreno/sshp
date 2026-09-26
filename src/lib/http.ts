import { NextResponse } from "next/server";
import {
  internalFailure,
  statusForFailure,
  type ActionFailure,
} from "@/lib/action-result";
import { UnauthenticatedError } from "@/lib/session";

/**
 * How read routes answer. Every route returns the same failure envelope with
 * the status that matches its code, and an unexpected error never reaches the
 * browser as raw text.
 */

export function jsonFailure(failure: ActionFailure): NextResponse {
  return NextResponse.json(
    { error: failure },
    { status: statusForFailure(failure.code) }
  );
}

/** Maps a rejected read onto the shared failure envelope. */
export function toFailureResponse(error: unknown): NextResponse {
  if (error instanceof UnauthenticatedError) {
    return jsonFailure(error.failure);
  }

  console.error("Read failed:", error);

  const { error: failure } = internalFailure();

  return jsonFailure(failure);
}

/** Reads an integer query parameter, ignoring anything unparseable. */
export function toIntegerParam(
  params: URLSearchParams,
  name: string
): number | undefined {
  const value = params.get(name);

  if (value === null) return undefined;

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? undefined : parsed;
}
