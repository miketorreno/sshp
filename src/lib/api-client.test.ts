import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, apiGet } from "@/lib/api-client";
import { FAILURE_CODES, FAILURE_MESSAGES } from "@/lib/action-result";

/** The api client only ever rejects with an ApiClientError, so a rejected read
 * hands one back for inspection instead of an opaque unknown. */
const rejectionFrom = async (path: string): Promise<ApiClientError> => {
  try {
    await apiGet(path);
  } catch (thrown) {
    if (thrown instanceof ApiClientError) {
      return thrown;
    }
    throw thrown;
  }

  throw new Error(`expected ${path} to reject`);
};

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("api client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed body of a successful read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(200, [{ id: "patient-1" }]))
    );

    await expect(apiGet<{ id: string }[]>("/api/patients")).resolves.toEqual([
      { id: "patient-1" },
    ]);
  });

  it("reuses the failure the read route reported", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(401, {
          error: {
            code: FAILURE_CODES.UNAUTHENTICATED,
            message: FAILURE_MESSAGES.UNAUTHENTICATED,
          },
        })
      )
    );

    const error = await rejectionFrom("/api/patients");

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error.code).toBe(FAILURE_CODES.UNAUTHENTICATED);
    expect(error.message).toBe(FAILURE_MESSAGES.UNAUTHENTICATED);
    expect(error.status).toBe(401);
  });

  it.each([
    [404, FAILURE_CODES.NOT_FOUND],
    [409, FAILURE_CODES.CONFLICT],
    [400, FAILURE_CODES.INVALID_INPUT],
    [500, FAILURE_CODES.FAILURE],
  ])("maps a %i response to %s", async (status, code) => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(status, {})));

    const error = await rejectionFrom("/api/patients");

    expect(error.code).toBe(code);
    expect(error.message).toBe(FAILURE_MESSAGES[code]);
    expect(error.status).toBe(status);
  });

  it("never leaks raw server text from a failed read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("<html>PrismaClientKnownRequestError: P2002</html>", {
            status: 500,
          })
      )
    );

    const error = await rejectionFrom("/api/patients");

    expect(error.message).toBe(FAILURE_MESSAGES.FAILURE);
  });

  it("reports an unreachable server as a failure rather than throwing raw", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      })
    );

    const error = await rejectionFrom("/api/patients");

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error.code).toBe(FAILURE_CODES.FAILURE);
    expect(error.status).toBe(0);
  });
});
