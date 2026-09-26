/**
 * The stable failure contract shared by write commands and read routes.
 *
 * Every command returns a discriminated result instead of throwing, so callers
 * never have to inspect raw database errors. Messages and HTTP statuses live
 * here so the same code always reads the same way to the browser.
 */

import type { ZodError, ZodType } from "zod";

export const FAILURE_CODES = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  INVALID_INPUT: "INVALID_INPUT",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  FAILURE: "FAILURE",
} as const;

export type FailureCode = (typeof FAILURE_CODES)[keyof typeof FAILURE_CODES];

export const FAILURE_MESSAGES: Record<FailureCode, string> = {
  UNAUTHENTICATED: "You need to sign in to continue.",
  INVALID_INPUT: "Please check the details you entered and try again.",
  NOT_FOUND: "The requested record could not be found.",
  CONFLICT: "That change conflicts with an existing record.",
  FAILURE: "Something went wrong. Please try again.",
};

const FAILURE_STATUSES: Record<FailureCode, number> = {
  UNAUTHENTICATED: 401,
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  FAILURE: 500,
};

export type ActionFailure = {
  code: FailureCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionFailure };

export type ActionFailureResult = { ok: false; error: ActionFailure };

export function actionSuccess<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

export function actionFailure(
  code: FailureCode,
  options?: { message?: string; fieldErrors?: Record<string, string[]> },
): ActionFailureResult {
  return {
    ok: false,
    error: {
      code,
      message: options?.message ?? FAILURE_MESSAGES[code],
      ...(options?.fieldErrors ? { fieldErrors: options.fieldErrors } : {}),
    },
  };
}

/** Reports a failure the resource already publishes as a stable failure. */
export function knownFailure(failure: ActionFailure): ActionFailureResult {
  return { ok: false, error: failure };
}

/** The catch-all failure for unexpected server errors. */
export function internalFailure(): ActionFailureResult {
  return actionFailure(FAILURE_CODES.FAILURE);
}

export function statusForFailure(code: FailureCode): number {
  return FAILURE_STATUSES[code];
}

/**
 * The field errors a form submission produced, in the shape a failure carries
 * them. One place owns that shape, so every form's field errors read the same way
 * to the browser no matter which schema rejected the submission.
 */
export function fieldErrorsFrom(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (typeof field !== "string") continue;

    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }

  return fieldErrors;
}

/**
 * Parses a form submission, or returns the failure the form should show: the
 * invalid-input result carrying one message per field the schema rejected.
 */
export function parseSubmission<T>(
  schema: ZodType<T>,
  submission: unknown,
): { ok: true; input: T } | ActionFailureResult {
  const parsed = schema.safeParse(submission);

  if (parsed.success) return { ok: true, input: parsed.data };

  return actionFailure(FAILURE_CODES.INVALID_INPUT, {
    fieldErrors: fieldErrorsFrom(parsed.error),
  });
}
