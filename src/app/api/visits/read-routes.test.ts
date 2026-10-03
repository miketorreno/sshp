import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { table, getSession } = await vi.hoisted(async () => {
  const { createVisitTable } = await import(
    "@/server/visits/test-support/visit-table"
  );

  return { table: createVisitTable(), getSession: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ getPrisma: () => table.prisma }));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import * as detailRoute from "@/app/api/visits/[id]/route";
import * as visitRoute from "@/app/api/visits/route";
import { FAILURE_CODES, FAILURE_MESSAGES } from "@/lib/action-result";
import {
  SESSION,
  hoursFromStartOfToday,
  clinicToday,
  seedVisits,
  visit,
} from "@/server/visits/test-support/seed";

const seed = (rows?: Parameters<typeof seedVisits>[1]) =>
  seedVisits(table, rows);

const listRequest = (query = "") =>
  new NextRequest(`http://localhost/api/visits${query}`);

const detailRequest = (id: string) =>
  detailRoute.GET(new NextRequest(`http://localhost/api/visits/${id}`), {
    params: Promise.resolve({ id }),
  });

const UNAUTHENTICATED_BODY = {
  error: {
    code: FAILURE_CODES.UNAUTHENTICATED,
    message: FAILURE_MESSAGES.UNAUTHENTICATED,
  },
};

describe("visit read routes", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    seed({
      visits: [
        visit({ id: "visit-1", startDateTime: hoursFromStartOfToday(1) }),
        visit({ id: "visit-2", startDateTime: hoursFromStartOfToday(3) }),
      ],
    });
  });

  it("serves reads only, on both routes, with no duplicate write methods", () => {
    expect(Object.keys(visitRoute)).toEqual(["GET"]);
    expect(Object.keys(detailRoute)).toEqual(["GET"]);
  });

  describe("list", () => {
    it("answers the day's window with summary DTOs", async () => {
      const today = clinicToday();
      const response = await visitRoute.GET(
        listRequest(`?from=${today}&to=${today}`),
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual([
        expect.objectContaining({
          id: "visit-1",
          startDateTime: hoursFromStartOfToday(1).toISOString(),
          patient: expect.objectContaining({ id: "patient-1" }),
          provider: expect.objectContaining({ id: "user-1" }),
        }),
        expect.objectContaining({ id: "visit-2" }),
      ]);
    });

    it("ignores a window that names no day, rather than guessing one", async () => {
      const response = await visitRoute.GET(listRequest("?from=yesterday"));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual([
        expect.objectContaining({ id: "visit-1" }),
        expect.objectContaining({ id: "visit-2" }),
      ]);
    });

    it("reads only the visit type the caller asked for", async () => {
      const response = await visitRoute.GET(
        listRequest("?visitType=EMERGENCY"),
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual([]);
    });

    it("rejects an unauthenticated read with the stable failure contract", async () => {
      getSession.mockResolvedValue(null);

      const response = await visitRoute.GET(listRequest());

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual(UNAUTHENTICATED_BODY);
    });
  });

  describe("detail", () => {
    it("answers with the detail DTO", async () => {
      const response = await detailRequest("visit-1");

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(
        expect.objectContaining({
          id: "visit-1",
          vitals: [],
          labOrders: [],
        }),
      );
    });

    it("answers not found for a missing or archived visit", async () => {
      const response = await detailRequest("visit-404");

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: { code: FAILURE_CODES.NOT_FOUND, message: "Visit not found" },
      });
    });

    it("rejects an unauthenticated read with the stable failure contract", async () => {
      getSession.mockResolvedValue(null);

      const response = await detailRequest("visit-1");

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual(UNAUTHENTICATED_BODY);
    });
  });

  describe("roles", () => {
    it("answers every visit read with forbidden for an account that holds no visit permission", async () => {
      getSession.mockResolvedValue({ ...SESSION, user: { ...SESSION.user, role: "PATIENT" } });

      const responses = [
        await visitRoute.GET(listRequest()),
        await detailRequest("visit-1"),
      ];

      for (const response of responses) {
        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({
          error: {
            code: FAILURE_CODES.FORBIDDEN,
            message: FAILURE_MESSAGES.FORBIDDEN,
          },
        });
      }
    });

    it("keeps the visit a check-in opens readable for the role that checks in", async () => {
      getSession.mockResolvedValue({
        ...SESSION,
        user: { ...SESSION.user, role: "RECEPTIONIST" },
      });

      // A check-in ends in the visit it opened, so the front desk has to be able
      // to read the visit its own check-in sends it to.
      await expect(detailRequest("visit-1")).resolves.toMatchObject({
        status: 200,
      });
    });
  });
});
