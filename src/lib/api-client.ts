import {
  FAILURE_CODES,
  FAILURE_MESSAGES,
  type ActionFailure,
  type FailureCode,
} from "@/lib/action-result";

/**
 * The one place browser reads go through. Every read route answers with the
 * shared failure contract, so the client turns a non-OK response into the same
 * stable failure the server reported, and never surfaces raw transport text.
 */

const UNREACHABLE_MESSAGE = "Could not reach the clinic server. Try again.";

const STATUS_CODES: Record<number, FailureCode> = {
  400: FAILURE_CODES.INVALID_INPUT,
  401: FAILURE_CODES.UNAUTHENTICATED,
  404: FAILURE_CODES.NOT_FOUND,
  409: FAILURE_CODES.CONFLICT,
};

export class ApiClientError extends Error {
  readonly code: FailureCode;
  readonly status: number;
  readonly failure: ActionFailure;

  constructor(failure: ActionFailure, status: number) {
    super(failure.message);
    this.name = "ApiClientError";
    this.code = failure.code;
    this.status = status;
    this.failure = failure;
  }
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init);

  if (!response.ok) {
    throw new ApiClientError(await failureFrom(response), response.status);
  }

  return (await response.json()) as T;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(path, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiClientError(
      { code: FAILURE_CODES.FAILURE, message: UNREACHABLE_MESSAGE },
      0
    );
  }
}

async function failureFrom(response: Response): Promise<ActionFailure> {
  const code = STATUS_CODES[response.status] ?? FAILURE_CODES.FAILURE;

  try {
    const body: unknown = await response.json();
    const reported = reportedFailure(body);

    if (reported) return reported;
  } catch {
    // A non-JSON error body is not a failure contract; fall back to the status.
  }

  return { code, message: FAILURE_MESSAGES[code] };
}

function reportedFailure(body: unknown): ActionFailure | null {
  if (typeof body !== "object" || body === null || !("error" in body)) return null;

  const { error } = body as { error: unknown };
  if (typeof error !== "object" || error === null) return null;

  const { code, message } = error as { code?: unknown; message?: unknown };
  const knownCode = Object.values(FAILURE_CODES).find(
    (candidate) => candidate === code
  );

  if (!knownCode || typeof message !== "string") return null;

  return { code: knownCode, message };
}
