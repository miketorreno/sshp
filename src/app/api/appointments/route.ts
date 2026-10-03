import { NextResponse, type NextRequest } from "next/server";
import {
  jsonFailure,
  toFailureResponse,
  toInstantParam,
  toIntegerParam,
} from "@/lib/http";
import { FAILURE_CODES, FAILURE_MESSAGES } from "@/lib/action-result";
import type {
  AppointmentListQuery,
  AppointmentWindow,
} from "@/server/appointments/contract";
import {
  listAppointments,
  listAppointmentsInWindow,
} from "@/server/appointments/reads";

/**
 * The appointment list read, in two modes.
 *
 * A caller that names a window gets exactly that window — that is the calendar,
 * which knows the days it drew. A caller that does not gets a page of the list.
 * The distinction is the caller's own, and the read reports which one it honoured
 * by answering one or the other rather than guessing.
 */
export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  try {
    const requested = requestedWindow(searchParams);

    if (requested.kind === "list") {
      return NextResponse.json(
        await listAppointments(toListQuery(searchParams)),
      );
    }

    if (requested.kind === "unanswerable") {
      // A window named halfway, or one that ends before it begins, is a question
      // the read cannot answer. Answering it with a page of the list instead
      // would leave the caller with a screen that looks empty rather than one
      // that says its own request was wrong.
      return jsonFailure({
        code: FAILURE_CODES.INVALID_INPUT,
        message: FAILURE_MESSAGES[FAILURE_CODES.INVALID_INPUT],
      });
    }

    return NextResponse.json(await listAppointmentsInWindow(requested.window));
  } catch (error) {
    return toFailureResponse(error);
  }
};

/** What a caller named with its `from`/`to` parameters. */
type RequestedWindow =
  | { kind: "window"; window: AppointmentWindow }
  /** Asked for no window at all, so it gets a page of the list. */
  | { kind: "list" }
  /** Named a window this read cannot honour. */
  | { kind: "unanswerable" };

function toListQuery(params: URLSearchParams): AppointmentListQuery {
  return {
    page: toIntegerParam(params, "page"),
    limit: toIntegerParam(params, "limit"),
    search: params.get("search") ?? undefined,
  };
}

/**
 * Reads the window a caller named, as one of three outcomes rather than a value
 * that has to be compared against a sentinel string.
 */
function requestedWindow(params: URLSearchParams): RequestedWindow {
  const namesFrom = params.has("from");
  const namesTo = params.has("to");

  if (!namesFrom && !namesTo) return { kind: "list" };

  if (!namesFrom || !namesTo) return { kind: "unanswerable" };

  const from = toInstantParam(params, "from");
  const to = toInstantParam(params, "to");

  if (from === undefined || to === undefined) return { kind: "unanswerable" };

  return from < to
    ? { kind: "window", window: { from, to } }
    : { kind: "unanswerable" };
}
