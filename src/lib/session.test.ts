import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, getAuth, headers } = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAuth: vi.fn(),
  headers: vi.fn(async () => new Headers({ cookie: "better-auth.session=abc" })),
}));

vi.mock("@/lib/auth", () => ({
  getAuth: () => getAuth() as { api: { getSession: typeof getSession } },
}));
vi.mock("next/headers", () => ({ headers: () => headers() }));

import {
  UnauthenticatedError,
  getSession as readSession,
  requireSession,
} from "@/lib/session";
import { FAILURE_CODES, FAILURE_MESSAGES } from "@/lib/action-result";

const ACTIVE_SESSION = {
  session: { id: "session-1", userId: "user-1" },
  user: {
    id: "user-1",
    email: "doctor@clinic.test",
    role: "DOCTOR",
    isActive: true,
  },
};

describe("session guard", () => {
  beforeEach(() => {
    getSession.mockReset();
    getAuth.mockReset();
    getAuth.mockReturnValue({ api: { getSession } });
    headers.mockReset();
    headers.mockResolvedValue(
      new Headers({ cookie: "better-auth.session=abc" })
    );
  });

  it("resolves the session from the request headers, which carry the auth cookies", async () => {
    getSession.mockResolvedValue(ACTIVE_SESSION);

    await expect(readSession()).resolves.toEqual(ACTIVE_SESSION);
    expect(getSession).toHaveBeenCalledWith({
      headers: expect.any(Headers),
    });
  });

  it("reaches for the request before it builds the auth system that reads it", async () => {
    const order: string[] = [];
    getAuth.mockImplementation(() => {
      order.push("auth");

      return { api: { getSession } };
    });
    headers.mockImplementation(async () => {
      order.push("headers");

      return new Headers();
    });

    await readSession();

    expect(order).toEqual(["headers", "auth"]);
  });

  it("does not build the auth system for a request that has no headers to read", async () => {
    headers.mockRejectedValue(
      new Error("headers() was called outside a request scope")
    );

    await expect(readSession()).rejects.toThrow("outside a request scope");
    expect(getAuth).not.toHaveBeenCalled();
  });

  it("returns null when there is no session", async () => {
    getSession.mockResolvedValue(null);

    await expect(readSession()).resolves.toBeNull();
  });

  it("returns the session when one exists", async () => {
    getSession.mockResolvedValue(ACTIVE_SESSION);

    await expect(requireSession()).resolves.toEqual(ACTIVE_SESSION);
  });

  it("rejects with the stable unauthenticated failure when no session exists", async () => {
    getSession.mockResolvedValue(null);

    const failure: unknown = await requireSession().catch((error) => error);

    expect(failure).toBeInstanceOf(UnauthenticatedError);
    expect((failure as UnauthenticatedError).failure).toEqual({
      code: FAILURE_CODES.UNAUTHENTICATED,
      message: FAILURE_MESSAGES.UNAUTHENTICATED,
    });
  });
});
