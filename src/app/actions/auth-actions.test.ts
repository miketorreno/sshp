import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "better-auth/api";

class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT: ${url}`);
  }
}

const { getSession, signInEmail, signOut, signUpEmail, redirect } = vi.hoisted(
  () => ({
    getSession: vi.fn(),
    signInEmail: vi.fn(),
    signOut: vi.fn(),
    signUpEmail: vi.fn(),
    redirect: vi.fn(),
  })
);

vi.mock("@/lib/auth", () => ({
  getAuth: () => ({ api: { getSession, signInEmail, signOut, signUpEmail } }),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: "better-auth.session=abc" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

import { signIn, signOut as endSession, signUp } from "@/app/actions/auth-actions";
import { FAILURE_CODES, FAILURE_MESSAGES } from "@/lib/action-result";

const SESSION = {
  session: { id: "session-1", userId: "user-1" },
  user: { id: "user-1", name: "Ada", email: "doctor@clinic.test" },
};

const CLINIC_HOME = "/";
const LOGIN_PAGE = "/login";

const WRONG_CREDENTIALS = new APIError("UNAUTHORIZED", {
  code: "INVALID_EMAIL_OR_PASSWORD",
  message: "Invalid email or password",
});

const EMAIL_TAKEN = new APIError("UNPROCESSABLE_ENTITY", {
  code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
  message: "User already exists. Use another email.",
});

const signedOut = {
  ok: false,
  error: {
    code: FAILURE_CODES.UNAUTHENTICATED,
    message: FAILURE_MESSAGES.UNAUTHENTICATED,
  },
};

describe("authentication form commands", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    signInEmail.mockReset().mockResolvedValue({ user: SESSION.user });
    signOut.mockReset().mockResolvedValue({ success: true });
    signUpEmail.mockReset().mockResolvedValue({ user: SESSION.user });
    redirect.mockReset().mockImplementation((url: string) => {
      throw new RedirectSignal(url);
    });
  });

  describe("sign up", () => {
    it("is public, so it signs someone up without a session to begin with", async () => {
      getSession.mockResolvedValue(null);

      await expect(signUp("Ada", "ada@clinic.test", "correct-horse")).rejects
        .toBeInstanceOf(RedirectSignal);

      expect(getSession).not.toHaveBeenCalled();
      expect(signUpEmail).toHaveBeenCalledWith({
        body: {
          name: "Ada",
          email: "ada@clinic.test",
          password: "correct-horse",
          callbackURL: CLINIC_HOME,
        },
      });
    });

    it("signs the new account in and lands in the clinic", async () => {
      await expect(
        signUp("Ada", "ada@clinic.test", "correct-horse"),
      ).rejects.toBeInstanceOf(RedirectSignal);

      expect(redirect).toHaveBeenCalledWith(CLINIC_HOME);
    });

    it("reports an email already in use, rather than the auth library's error", async () => {
      signUpEmail.mockRejectedValue(EMAIL_TAKEN);

      await expect(
        signUp("Ada", "ada@clinic.test", "correct-horse"),
      ).resolves.toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.CONFLICT,
          message: "An account already exists for that email.",
        },
      });
      expect(redirect).not.toHaveBeenCalled();
    });

    it("does not blame the email for a sign-up the auth library could not complete", async () => {
      signUpEmail.mockRejectedValue(
        new APIError("UNPROCESSABLE_ENTITY", {
          code: "FAILED_TO_CREATE_USER",
          message: "Failed to create user",
        }),
      );

      const result = await signUp("Ada", "ada@clinic.test", "correct-horse");

      expect(result).toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.FAILURE,
          message: FAILURE_MESSAGES.FAILURE,
        },
      });
    });

    it("reports credentials the auth library rejects as invalid input", async () => {
      signUpEmail.mockRejectedValue(
        new APIError("BAD_REQUEST", {
          code: "PASSWORD_TOO_SHORT",
          message: "Password is too short",
        }),
      );

      const result = await signUp("Ada", "ada@clinic.test", "short");

      expect(result).toMatchObject({
        ok: false,
        error: { code: FAILURE_CODES.INVALID_INPUT },
      });
      expect(JSON.stringify(result)).not.toContain("too short");
      expect(redirect).not.toHaveBeenCalled();
    });

    it("never surfaces an unexpected auth error to the browser", async () => {
      signUpEmail.mockRejectedValue(
        new Error("connection to 10.0.0.4:5432 refused"),
      );

      await expect(
        signUp("Ada", "ada@clinic.test", "correct-horse"),
      ).resolves.toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.FAILURE,
          message: FAILURE_MESSAGES.FAILURE,
        },
      });
    });
  });

  describe("sign in", () => {
    it("is public, so it signs someone in without a session to begin with", async () => {
      getSession.mockResolvedValue(null);

      await expect(signIn("ada@clinic.test", "correct-horse")).rejects
        .toBeInstanceOf(RedirectSignal);

      expect(getSession).not.toHaveBeenCalled();
      expect(signInEmail).toHaveBeenCalledWith({
        body: {
          email: "ada@clinic.test",
          password: "correct-horse",
          callbackURL: CLINIC_HOME,
        },
      });
    });

    it("opens the session and lands in the clinic", async () => {
      await expect(signIn("ada@clinic.test", "correct-horse")).rejects
        .toBeInstanceOf(RedirectSignal);

      expect(redirect).toHaveBeenCalledWith(CLINIC_HOME);
    });

    it("reports wrong credentials as invalid input, without the auth library's wording", async () => {
      signInEmail.mockRejectedValue(WRONG_CREDENTIALS);

      const result = await signIn("ada@clinic.test", "not-the-password");

      expect(result).toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.INVALID_INPUT,
          message: "That email and password do not match an account.",
        },
      });
      expect(redirect).not.toHaveBeenCalled();
    });

    it("never surfaces an unexpected auth error to the browser", async () => {
      signInEmail.mockRejectedValue(new Error("prisma: P1001 unreachable"));

      await expect(
        signIn("ada@clinic.test", "correct-horse"),
      ).resolves.toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.FAILURE,
          message: FAILURE_MESSAGES.FAILURE,
        },
      });
    });
  });

  describe("sign out", () => {
    it("refuses without a session, and leaves the session alone", async () => {
      getSession.mockResolvedValue(null);

      await expect(endSession()).resolves.toEqual(signedOut);

      expect(signOut).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    it("completes the session from the cookies that carry it, then returns to sign in", async () => {
      await expect(endSession()).rejects.toBeInstanceOf(RedirectSignal);

      expect(signOut).toHaveBeenCalledTimes(1);
      expect(signOut.mock.calls[0]?.[0].headers.get("cookie")).toBe(
        "better-auth.session=abc"
      );
      expect(redirect).toHaveBeenCalledWith(LOGIN_PAGE);
    });

    it("keeps the clinician on the page rather than signing them out when it fails", async () => {
      signOut.mockRejectedValue(new Error("connection to 10.0.0.4:5432 refused"));

      await expect(endSession()).resolves.toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.FAILURE,
          message: FAILURE_MESSAGES.FAILURE,
        },
      });
      expect(redirect).not.toHaveBeenCalled();
    });
  });
});
