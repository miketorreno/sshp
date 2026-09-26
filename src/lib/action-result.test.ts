import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  FAILURE_CODES,
  FAILURE_MESSAGES,
  actionFailure,
  actionSuccess,
  fieldErrorsFrom,
  knownFailure,
  parseSubmission,
  statusForFailure,
} from "@/lib/action-result";

describe("action results", () => {
  it("wraps command output in a success result", () => {
    expect(actionSuccess({ id: "patient-1" })).toEqual({
      ok: true,
      data: { id: "patient-1" },
    });
  });

  it("gives every failure code a stable message and HTTP status", () => {
    for (const code of Object.values(FAILURE_CODES)) {
      expect(actionFailure(code)).toEqual({
        ok: false,
        error: { code, message: FAILURE_MESSAGES[code] },
      });
    }

    expect(statusForFailure(FAILURE_CODES.UNAUTHENTICATED)).toBe(401);
    expect(statusForFailure(FAILURE_CODES.INVALID_INPUT)).toBe(400);
    expect(statusForFailure(FAILURE_CODES.NOT_FOUND)).toBe(404);
    expect(statusForFailure(FAILURE_CODES.CONFLICT)).toBe(409);
    expect(statusForFailure(FAILURE_CODES.FAILURE)).toBe(500);
  });

  it("carries field errors for invalid input", () => {
    const result = actionFailure(FAILURE_CODES.INVALID_INPUT, {
      fieldErrors: { email: ["Enter a valid email address"] },
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: FAILURE_MESSAGES.INVALID_INPUT,
        fieldErrors: { email: ["Enter a valid email address"] },
      },
    });
  });

  it("keeps the code stable when a resource supplies its own message", () => {
    expect(
      actionFailure(FAILURE_CODES.NOT_FOUND, { message: "Patient not found" }),
    ).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Patient not found" },
    });
  });

  it("reports a failure a resource already publishes", () => {
    const patientNotFound = {
      code: FAILURE_CODES.NOT_FOUND,
      message: "Patient not found",
    };

    expect(knownFailure(patientNotFound)).toEqual({
      ok: false,
      error: patientNotFound,
    });
  });

  it("turns a schema's rejections into one message per field", () => {
    const schema = z.object({
      email: z.string().email("Enter a valid email address"),
      age: z.number({ error: "Enter a number" }),
    });

    const parsed = schema.safeParse({ email: "nope", age: "" });

    expect(parsed.success).toBe(false);
    expect(parsed.success ? null : fieldErrorsFrom(parsed.error)).toEqual({
      email: ["Enter a valid email address"],
      age: ["Enter a number"],
    });
  });

  it("parses a submission, or reports the invalid input the form should show", () => {
    const schema = z.object({ email: z.string().min(1, "Enter an email") });

    expect(parseSubmission(schema, { email: "a@b.test" })).toEqual({
      ok: true,
      input: { email: "a@b.test" },
    });
    expect(parseSubmission(schema, { email: "" })).toEqual({
      ok: false,
      error: {
        code: FAILURE_CODES.INVALID_INPUT,
        message: FAILURE_MESSAGES.INVALID_INPUT,
        fieldErrors: { email: ["Enter an email"] },
      },
    });
  });
});
