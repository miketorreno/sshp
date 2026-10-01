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

import { Role } from "@/generated/prisma";
import { FAILURE_CODES, FAILURE_MESSAGES } from "@/lib/action-result";
import { ForbiddenError, UnauthenticatedError } from "@/lib/session";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  authorize,
  can,
  requirePermission,
  type Permission,
} from "@/server/access";

const EVERY_PERMISSION = Object.values(PERMISSIONS);

const RESTORES = EVERY_PERMISSION.filter((permission) =>
  permission.endsWith(":restore"),
);

const CLINICAL_ROLES = [
  Role.DOCTOR,
  Role.NURSE,
  Role.RECEPTIONIST,
  Role.LAB_TECHNICIAN,
  Role.IMAGING_TECHNICIAN,
  Role.PHARMACIST,
] as const;

const sessionOf = (role: string, isActive = true) => ({
  session: { id: "session-1", userId: "user-1" },
  user: { id: "user-1", email: `${role.toLowerCase()}@clinic.test`, role, isActive },
});

describe("role permissions", () => {
  beforeEach(() => {
    getSession.mockReset();
    getAuth.mockReset();
    getAuth.mockReturnValue({ api: { getSession } });
    headers.mockReset();
    headers.mockResolvedValue(
      new Headers({ cookie: "better-auth.session=abc" }),
    );
  });

  describe("the matrix", () => {
    it("answers for every role the schema names", () => {
      expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual(
        Object.values(Role).sort(),
      );
    });

    it("gives the administrative roles every permission", () => {
      for (const permission of EVERY_PERMISSION) {
        expect(can(Role.ADMIN, permission)).toBe(true);
        expect(can(Role.SUPERUSER, permission)).toBe(true);
      }
    });

    it("reserves restore for the administrative roles alone", () => {
      for (const role of CLINICAL_ROLES) {
        for (const permission of RESTORES) {
          expect(can(role, permission)).toBe(false);
        }
      }
    });

    it("keeps a role's read out of the clinical record it may not read", () => {
      expect(can(Role.RECEPTIONIST, PERMISSIONS.PATIENTS_READ)).toBe(true);
      expect(can(Role.RECEPTIONIST, PERMISSIONS.ORDERS_WRITE)).toBe(false);
      expect(can(Role.LAB_TECHNICIAN, PERMISSIONS.VISITS_READ)).toBe(true);
      expect(can(Role.LAB_TECHNICIAN, PERMISSIONS.ORDERS_WRITE)).toBe(false);
    });

    it("refuses a role named after something on the prototype chain", () => {
      // `in` would answer with `Object.prototype`'s member, and asking that
      // whether it holds a permission would throw rather than refuse.
      for (const permission of EVERY_PERMISSION) {
        expect(can("toString", permission)).toBe(false);
        expect(can("constructor", permission)).toBe(false);
      }
    });

    it("holds no permission for a patient account or a role it does not name", () => {
      for (const permission of EVERY_PERMISSION) {
        expect(can(Role.PATIENT, permission)).toBe(false);
        expect(can("CLERK", permission)).toBe(false);
        expect(can(undefined, permission)).toBe(false);
      }
    });
  });

  describe("reading", () => {
    it("returns the session when the role holds the permission", async () => {
      const session = sessionOf(Role.DOCTOR);

      getSession.mockResolvedValue(session);

      await expect(
        requirePermission(PERMISSIONS.VISITS_READ),
      ).resolves.toEqual(session);
    });

    it("rejects with the stable forbidden failure when the role does not", async () => {
      getSession.mockResolvedValue(sessionOf(Role.RECEPTIONIST));

      const refusal: unknown = await requirePermission(
        PERMISSIONS.ORDERS_WRITE,
      ).catch((error) => error);

      expect(refusal).toBeInstanceOf(ForbiddenError);
      expect((refusal as ForbiddenError).failure).toEqual({
        code: FAILURE_CODES.FORBIDDEN,
        message: FAILURE_MESSAGES.FORBIDDEN,
      });
    });

    it("rejects an unauthenticated caller as unauthenticated, not as forbidden", async () => {
      getSession.mockResolvedValue(null);

      await expect(
        requirePermission(PERMISSIONS.PATIENTS_READ),
      ).rejects.toBeInstanceOf(UnauthenticatedError);
    });
  });

  describe("writing", () => {
    it("returns the session when the role holds the permission", async () => {
      const session = sessionOf(Role.NURSE);

      getSession.mockResolvedValue(session);

      await expect(authorize(PERMISSIONS.VITALS_WRITE)).resolves.toEqual({
        ok: true,
        data: session,
      });
    });

    it("reports a refused write as forbidden", async () => {
      getSession.mockResolvedValue(sessionOf(Role.PHARMACIST));

      await expect(authorize(PERMISSIONS.VISITS_WRITE)).resolves.toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.FORBIDDEN,
          message: FAILURE_MESSAGES.FORBIDDEN,
        },
      });
    });

    it("reports a write with no session as unauthenticated", async () => {
      getSession.mockResolvedValue(null);

      await expect(authorize(PERMISSIONS.PATIENTS_WRITE)).resolves.toEqual({
        ok: false,
        error: {
          code: FAILURE_CODES.UNAUTHENTICATED,
          message: FAILURE_MESSAGES.UNAUTHENTICATED,
        },
      });
    });
  });

  it("holds nothing for a deactivated account, whatever role it kept", async () => {
    getSession.mockResolvedValue(sessionOf(Role.ADMIN, false));

    expect(can(Role.ADMIN, PERMISSIONS.PATIENTS_WRITE)).toBe(true);
    await expect(authorize(PERMISSIONS.PATIENTS_WRITE)).resolves.toEqual({
      ok: false,
      error: {
        code: FAILURE_CODES.FORBIDDEN,
        message: FAILURE_MESSAGES.FORBIDDEN,
      },
    });
  });

  it("answers for a permission the app does not name", () => {
    // The type of a permission is the union of the names above, so this is the
    // check that a name arriving as a string is one of them: an administrator
    // holds every permission there is, and there is no such one as this.
    const unlisted = "patients:teleport" as Permission;

    expect(can(Role.ADMIN, unlisted)).toBe(false);
    expect(can(Role.SUPERUSER, unlisted)).toBe(false);
  });
});
