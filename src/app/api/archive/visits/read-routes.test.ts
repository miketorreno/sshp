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

import * as ordersRoute from "@/app/api/archive/orders/route";
import * as vitalsRoute from "@/app/api/archive/vitals/route";
import * as visitsRoute from "@/app/api/archive/visits/route";
import {
  FAILURE_CODES,
  FAILURE_MESSAGES,
} from "@/lib/action-result";
import {
  PATIENT,
  SESSION,
  labOrder,
  medOrder,
  seedVisits,
  visit,
  vitals,
} from "@/server/visits/test-support/seed";

/**
 * The three archived clinical sections, as the browser reads them.
 *
 * They share one fixture because they share one ownership: a visit, and the readings
 * and orders recorded during it. The archive unwinds from the visit down, so the
 * three routes are where that order becomes visible — a row says which record has to
 * come back before it can.
 */

const ARCHIVED_AT = new Date("2026-02-01T00:00:00.000Z");

const requestFor = (section: string) => (query = "") =>
  new NextRequest(`http://localhost/api/archive/${section}${query}`);

const UNAUTHENTICATED_BODY = {
  error: {
    code: FAILURE_CODES.UNAUTHENTICATED,
    message: FAILURE_MESSAGES.UNAUTHENTICATED,
  },
};

const FORBIDDEN_BODY = {
  error: { code: FAILURE_CODES.FORBIDDEN, message: FAILURE_MESSAGES.FORBIDDEN },
};

describe("archived clinical routes", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    seedVisits(table, {
      visits: [visit({ deletedAt: ARCHIVED_AT })],
      vitals: [vitals({ deletedAt: ARCHIVED_AT })],
      labOrders: [labOrder({ deletedAt: ARCHIVED_AT })],
      medOrders: [medOrder({ deletedAt: ARCHIVED_AT })],
      medications: [{ id: "medication-1", name: "Amoxicillin" }],
    });
  });

  it.each([
    ["visits", visitsRoute],
    ["vitals", vitalsRoute],
    ["orders", ordersRoute],
  ])("serves %s as a read, with no duplicate write methods", (_section, route) => {
    expect(Object.keys(route)).toEqual(["GET"]);
  });

  it("answers with the archived visits", async () => {
    const response = await visitsRoute.GET(requestFor("visits")());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      rows: [
        {
          id: "visit-1",
          visitType: "CLINIC",
          startDateTime: "2026-03-02T09:00:00.000Z",
          endDateTime: null,
          reason: "Annual check",
          patient: { id: "patient-1", name: "Ada Quincy Lovelace" },
          archivedAt: ARCHIVED_AT.toISOString(),
          restoreBlockedBy: null,
        },
      ],
      totalCount: 1,
    });
  });

  it("answers with the archived readings, naming the visit to restore first", async () => {
    const response = await vitalsRoute.GET(requestFor("vitals")());

    await expect(response.json()).resolves.toMatchObject({
      rows: [
        {
          id: "vitals-1",
          visitId: "visit-1",
          systolicBP: 120,
          patient: { id: "patient-1", name: "Ada Quincy Lovelace" },
          restoreBlockedBy: {
            recordType: "Visit",
            id: "visit-1",
            patientName: "Ada Quincy Lovelace",
          },
        },
      ],
      totalCount: 1,
    });
  });

  it("answers with the archived orders, most recent archive first", async () => {
    const response = await ordersRoute.GET(requestFor("orders")());

    await expect(response.json()).resolves.toMatchObject({
      rows: [
        // The medication order first: both were archived in the same moment, so the
        // id decides, and "med-order-1" is the higher one.
        {
          kind: "MEDICATION",
          id: "med-order-1",
          orderName: "Amoxicillin",
          instructions: "500mg, Twice a day, Oral",
          patient: { id: "patient-1", name: "Ada Quincy Lovelace" },
        },
        {
          kind: "LAB",
          id: "lab-order-1",
          orderName: "Complete Blood Count",
          instructions: null,
        },
      ],
      totalCount: 2,
    });
  });

  it("reads the page and the limit off the query string", async () => {
    const response = await visitsRoute.GET(
      requestFor("visits")("?page=1&limit=5"),
    );

    await expect(response.json()).resolves.toMatchObject({
      page: 1,
      pageSize: 5,
    });
  });

  it.each([
    ["visits", visitsRoute],
    ["vitals", vitalsRoute],
    ["orders", ordersRoute],
  ])("rejects an unauthenticated read of %s", async (section, route) => {
    getSession.mockResolvedValue(null);

    const response = await route.GET(requestFor(section)());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual(UNAUTHENTICATED_BODY);
  });

  it.each([
    ["visits", visitsRoute],
    ["vitals", vitalsRoute],
    ["orders", ordersRoute],
  ])("rejects a session that cannot archive %s", async (section, route) => {
    getSession.mockResolvedValue({
      ...SESSION,
      user: { ...SESSION.user, role: "PHARMACIST" },
    });

    const response = await route.GET(requestFor(section)());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual(FORBIDDEN_BODY);
  });

  it("refuses a patient account, which holds no archive permission at all", async () => {
    // The one role in the matrix that holds nothing, so this is the account a
    // patient signing in brings.
    getSession.mockResolvedValue({
      ...SESSION,
      user: { ...SESSION.user, role: "PATIENT" },
    });

    const response = await visitsRoute.GET(requestFor("visits")());

    expect(response.status).toBe(403);
  });

  it("answers an empty page rather than an error when nothing is archived", async () => {
    seedVisits(table, { visits: [visit()], vitals: [], labOrders: [], medOrders: [] });

    const response = await visitsRoute.GET(requestFor("visits")());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      rows: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
    });
  });
});
