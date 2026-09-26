import { beforeEach, describe, expect, it, vi } from "vitest";

const { table, getSession } = await vi.hoisted(async () => {
  const { createVisitTable } = await import(
    "@/server/visits/test-support/visit-table"
  );

  return { table: createVisitTable(), getSession: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ getPrisma: () => table.prisma }));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { FAILURE_CODES } from "@/lib/action-result";
import {
  ARCHIVED_PATIENT,
  CHECKED_OUT,
  SESSION,
  imagingOrder,
  labOrder,
  medOrder,
  medication,
  seedVisits,
  visit,
} from "@/server/visits/test-support/seed";
import {
  archiveImagingOrder,
  archiveLabOrder,
  archiveMedicationOrder,
  requestImagingOrder,
  requestLabOrder,
  requestMedicationOrder,
  type ImagingOrderInput,
  type LabOrderInput,
  type MedicationOrderInput,
} from "@/server/visits/order-commands";

const ARCHIVED_AT = new Date("2026-02-01T00:00:00.000Z");

const lab = (overrides: Partial<LabOrderInput> = {}): LabOrderInput => ({
  labType: "Complete Blood Count",
  notes: "fasting",
  ...overrides,
});

const imaging = (
  overrides: Partial<ImagingOrderInput> = {},
): ImagingOrderInput => ({
  imagingType: "Chest X-Ray (2 views)",
  notes: "two views",
  ...overrides,
});

const medicationRequest = (
  overrides: Partial<MedicationOrderInput> = {},
): MedicationOrderInput => ({
  medicationId: "medication-1",
  dosage: "500mg",
  frequency: "Twice a day",
  route: "Oral",
  notes: "with food",
  ...overrides,
});

const seed = (rows?: Parameters<typeof seedVisits>[1]) =>
  seedVisits(table, rows);

/** The row a request reported creating, so a case reads as the fact it checks. */
const created = (result: { ok: true; data: { id: string } }) =>
  [
    ...table.labOrders,
    ...table.imagingOrders,
    ...table.medOrders,
  ].find((row) => row.id === result.data.id);

/**
 * The three kinds are requested alike, so the rules are stated once for all of
 * them. Each row carries the one thing that differs: what the order names, and
 * the fields that end up on the row.
 */
const REQUESTABLE = [
  {
    order: "a lab test",
    ask: (visitId: string) => requestLabOrder(visitId, lab()),
    needed: {},
    expected: { labType: "Complete Blood Count", notes: "fasting" },
    rows: () => table.labOrders,
  },
  {
    order: "an imaging study",
    ask: (visitId: string) => requestImagingOrder(visitId, imaging()),
    needed: {},
    expected: { imagingType: "Chest X-Ray (2 views)", notes: "two views" },
    rows: () => table.imagingOrders,
  },
  {
    order: "a medication",
    ask: (visitId: string) => requestMedicationOrder(visitId, medicationRequest()),
    needed: { medications: [medication()] },
    expected: {
      medicationId: "medication-1",
      dosage: "500mg",
      frequency: "Twice a day",
      route: "Oral",
      notes: "with food",
    },
    rows: () => table.medOrders,
  },
];

describe.each(REQUESTABLE)("requesting $order", (requested) => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    seed(requested.needed);
  });

  it("refuses a write with no session", async () => {
    getSession.mockResolvedValue(null);

    await expect(requested.ask("visit-1")).resolves.toMatchObject({
      ok: false,
      error: { code: FAILURE_CODES.UNAUTHENTICATED },
    });
    expect(requested.rows()).toHaveLength(0);
  });

  it("answers not found when the visit is missing or its patient is archived", async () => {
    seed({ patients: [ARCHIVED_PATIENT] });

    await expect(requested.ask("visit-1")).resolves.toMatchObject({
      ok: false,
      error: { code: FAILURE_CODES.NOT_FOUND },
    });
    expect(requested.rows()).toHaveLength(0);
  });

  it(`refuses to order ${requested.order} for a visit that is checked out`, async () => {
    seed({ visits: [visit({ endDateTime: CHECKED_OUT })] });

    await expect(requested.ask("visit-1")).resolves.toMatchObject({
      ok: false,
      error: { code: FAILURE_CODES.CONFLICT },
    });
    expect(requested.rows()).toHaveLength(0);
  });

  it(`requests ${requested.order} during the addressed visit, attributed to the ordering clinician`, async () => {
    const result = await requested.ask("visit-1");

    expect(result).toMatchObject({ ok: true });
    expect(result.ok && created(result)).toMatchObject({
      visitId: "visit-1",
      orderedById: "user-1",
      orderStatus: "REQUESTED",
      deletedAt: null,
      ...requested.expected,
    });
  });
});

describe("requesting a medication", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
  });

  it("answers not found for a medication the pharmacy's catalogue does not hold", async () => {
    seed({ medications: [medication({ deletedAt: ARCHIVED_AT })] });

    await expect(
      requestMedicationOrder(
        "visit-1",
        medicationRequest({ medicationId: "medication-404" }),
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: FAILURE_CODES.NOT_FOUND },
    });
    expect(table.medOrders).toHaveLength(0);
  });
});

/** The three kinds archive alike, so the rules are stated once for all of them. */
const ARCHIVABLE = [
  {
    kind: "lab",
    archive: archiveLabOrder,
    order: labOrder,
    find: (id: string) => table.findLabOrder(id),
    seeded: (orders: Record<string, unknown>[]) => ({ labOrders: orders }),
  },
  {
    kind: "imaging",
    archive: archiveImagingOrder,
    order: imagingOrder,
    find: (id: string) => table.findImagingOrder(id),
    seeded: (orders: Record<string, unknown>[]) => ({ imagingOrders: orders }),
  },
  {
    kind: "medication",
    archive: archiveMedicationOrder,
    order: medOrder,
    find: (id: string) => table.findMedOrder(id),
    seeded: (orders: Record<string, unknown>[]) => ({ medOrders: orders }),
  },
] as const;

describe.each(ARCHIVABLE)("archiving a $kind order", (kind) => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
  });

  it("refuses a write with no session", async () => {
    seed(kind.seeded([kind.order({ id: "order-1" })]));
    getSession.mockResolvedValue(null);

    await expect(kind.archive("visit-1", "order-1")).resolves.toMatchObject({
      ok: false,
      error: { code: FAILURE_CODES.UNAUTHENTICATED },
    });
    expect(kind.find("order-1")?.deletedAt).toBeNull();
  });

  it("answers not found if the visit or the order do not belong together", async () => {
    seed({
      visits: [visit(), visit({ id: "visit-2" })],
      ...kind.seeded([kind.order({ id: "order-1", visitId: "visit-2" })]),
    });

    await expect(kind.archive("visit-1", "order-1")).resolves.toMatchObject({
      ok: false,
      error: { code: FAILURE_CODES.NOT_FOUND },
    });
    expect(kind.find("order-1")?.deletedAt).toBeNull();
  });

  it("refuses to archive the order after checkout", async () => {
    seed({
      visits: [visit({ endDateTime: CHECKED_OUT })],
      ...kind.seeded([kind.order({ id: "order-1" })]),
    });

    await expect(kind.archive("visit-1", "order-1")).resolves.toMatchObject({
      ok: false,
      error: { code: FAILURE_CODES.CONFLICT },
    });
    expect(kind.find("order-1")?.deletedAt).toBeNull();
  });

  it("archives the order rather than destroying or cancelling it", async () => {
    seed(kind.seeded([kind.order({ id: "order-1" })]));

    const result = await kind.archive("visit-1", "order-1");

    expect(result).toMatchObject({ ok: true, data: { id: "order-1" } });
    const archived = kind.find("order-1");
    expect(archived?.deletedAt).toBeInstanceOf(Date);
    expect(archived?.orderStatus).toBe("REQUESTED");
    expect(table.destroyed).toEqual([]);
  });

  it("is idempotent when already archived", async () => {
    seed(kind.seeded([kind.order({ id: "order-1", deletedAt: ARCHIVED_AT })]));

    const result = await kind.archive("visit-1", "order-1");

    expect(result).toMatchObject({ ok: true, data: { id: "order-1" } });
    expect(kind.find("order-1")?.deletedAt).toEqual(ARCHIVED_AT);
  });

  it("refuses an already archived order once checkout has closed the visit", async () => {
    seed({
      visits: [visit({ endDateTime: CHECKED_OUT })],
      ...kind.seeded([kind.order({ id: "order-1", deletedAt: ARCHIVED_AT })]),
    });

    const result = await kind.archive("visit-1", "order-1");

    expect(result).toMatchObject({
      ok: false,
      error: { code: FAILURE_CODES.CONFLICT },
    });
    expect(kind.find("order-1")?.deletedAt).toEqual(ARCHIVED_AT);
  });
});
