/**
 * The stable failure contract shared by write commands and read routes.
 *
 * Every command returns a discriminated result instead of throwing, so callers
 * never have to inspect raw database errors. Messages and HTTP statuses live
 * here so the same code always reads the same way to the browser.
 */

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
  options?: { message?: string; fieldErrors?: Record<string, string[]> }
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

