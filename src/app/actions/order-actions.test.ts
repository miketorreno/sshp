import { beforeEach, describe, expect, it, vi } from "vitest";

const { table, getSession, revalidatePath } = await vi.hoisted(async () => {
  const { createVisitTable } = await import(
    "@/server/visits/test-support/visit-table"
  );

  return {
    table: createVisitTable(),
    getSession: vi.fn(),
    revalidatePath: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ getPrisma: () => table.prisma }));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath }));

import {
  archiveImagingOrder,
  archiveLabOrder,
  archiveMedicationOrder,
  requestImagingOrder,
  requestLabOrder,
  requestMedicationOrder,
} from "@/app/actions/order-actions";
import { FAILURE_CODES, FAILURE_MESSAGES } from "@/lib/action-result";
import {
  SESSION,
  imagingOrder,
  labOrder,
  medOrder,
  medication,
  seedVisits,
  visit,
} from "@/server/visits/test-support/seed";

const seed = (rows?: Parameters<typeof seedVisits>[1]) =>
  seedVisits(table, rows);

function orderForm(fields: Record<string, string> = {}) {
  const form = new FormData();

  for (const [name, value] of Object.entries({ id: "visit-1", ...fields })) {
    form.append(name, value);
  }

  return form;
}

const labForm = (overrides: Record<string, string> = {}) =>
  orderForm({ labType: "Complete Blood Count", notes: "fasting", ...overrides });

const imagingForm = (overrides: Record<string, string> = {}) =>
  orderForm({
    imagingType: "Chest X-Ray (2 views)",
    notes: "two views",
    ...overrides,
  });

const medicationForm = (overrides: Record<string, string> = {}) =>
  orderForm({
    medicationId: "medication-1",
    dosage: "500mg",
    frequency: "Twice a day",
    route: "Oral",
    notes: "with food",
    ...overrides,
  });

const signedOut = {
  ok: false,
  error: {
    code: FAILURE_CODES.UNAUTHENTICATED,
    message: FAILURE_MESSAGES.UNAUTHENTICATED,
  },
};

describe("order form commands", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(SESSION);
    seed({
      labOrders: [labOrder()],
      imagingOrders: [imagingOrder()],
      medOrders: [medOrder()],
      medications: [medication()],
    });
    revalidatePath.mockReset();
  });

  it("refuses every command without a session", async () => {
    getSession.mockResolvedValue(null);

    await expect(requestLabOrder(labForm())).resolves.toEqual(signedOut);
    await expect(requestImagingOrder(imagingForm())).resolves.toEqual(
      signedOut,
    );
    await expect(requestMedicationOrder(medicationForm())).resolves.toEqual(
      signedOut,
    );
    await expect(archiveLabOrder("visit-1", "lab-order-1")).resolves.toEqual(
      signedOut,
    );
    await expect(
      archiveImagingOrder("visit-1", "imaging-order-1"),
    ).resolves.toEqual(signedOut);
    await expect(
      archiveMedicationOrder("visit-1", "med-order-1"),
    ).resolves.toEqual(signedOut);

    expect(table.labOrders[0]?.deletedAt).toBeNull();
    expect(table.imagingOrders[0]?.deletedAt).toBeNull();
    expect(table.medOrders[0]?.deletedAt).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a request that names no lab test, naming that box", async () => {
    const result = await requestLabOrder(labForm({ labType: " " }));

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: FAILURE_CODES.INVALID_INPUT,
        fieldErrors: expect.objectContaining({
          labType: ["Enter the lab test"],
        }),
      },
    });
    expect(table.labOrders).toHaveLength(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a medication request that names no medication, naming that box", async () => {
    const result = await requestMedicationOrder(
      medicationForm({ medicationId: " " }),
    );

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: FAILURE_CODES.INVALID_INPUT,
        fieldErrors: expect.objectContaining({
          medicationId: ["Select a medication"],
        }),
      },
    });
    expect(table.medOrders).toHaveLength(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a request that names no visit, naming the visit box", async () => {
    const form = labForm();
    form.delete("id");

    const result = await requestLabOrder(form);

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: FAILURE_CODES.INVALID_INPUT,
        fieldErrors: { id: ["Choose the visit to order a lab test"] },
      },
    });
    expect(table.labOrders).toHaveLength(1);
  });

  it("requests the lab test against the visit the form addresses and reports it", async () => {
    const result = await requestLabOrder(labForm());

    expect(result).toMatchObject({ ok: true, data: { id: table.labOrders[1]?.id } });
    expect(table.labOrders[1]).toMatchObject({
      visitId: "visit-1",
      orderedById: "user-1",
      labType: "Complete Blood Count",
      notes: "fasting",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/visits/visit-1");
  });

  it("requests the imaging study against the visit the form addresses and reports it", async () => {
    const result = await requestImagingOrder(imagingForm());

    expect(result).toMatchObject({
      ok: true,
      data: { id: table.imagingOrders[1]?.id },
    });
    expect(table.imagingOrders[1]).toMatchObject({
      visitId: "visit-1",
      orderedById: "user-1",
      imagingType: "Chest X-Ray (2 views)",
      notes: "two views",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/visits/visit-1");
  });

  it("keeps the medication a request chose, rather than dropping it", async () => {
    const result = await requestMedicationOrder(medicationForm());

    expect(result).toMatchObject({
      ok: true,
      data: { id: table.medOrders[1]?.id },
    });
    expect(table.medOrders[1]).toMatchObject({
      visitId: "visit-1",
      orderedById: "user-1",
      medicationId: "medication-1",
      dosage: "500mg",
      frequency: "Twice a day",
      route: "Oral",
      notes: "with food",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/visits/visit-1");
  });

  it("keeps an order against the addressed visit, not one named in the submission", async () => {
    const form = medicationForm();
    form.set("visitId", "visit-2");

    await requestMedicationOrder(form);

    expect(table.medOrders[1]?.visitId).toBe("visit-1");
  });

  it("keeps an order recorded during another visit out of reach", async () => {
    const elsewhere = { ...labOrder(), id: "lab-order-2", visitId: "visit-2" };
    seed({
      visits: [visit(), visit({ id: "visit-2" })],
      labOrders: [labOrder(), elsewhere],
    });

    await expect(
      archiveLabOrder("visit-1", "lab-order-2"),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: FAILURE_CODES.NOT_FOUND },
    });
    expect(table.findLabOrder("lab-order-2")?.deletedAt).toBeNull();
  });

  it("archives each order and reports it, so the visit read can be invalidated", async () => {
    await expect(
      archiveLabOrder("visit-1", "lab-order-1"),
    ).resolves.toMatchObject({ ok: true, data: { id: "lab-order-1" } });
    await expect(
      archiveImagingOrder("visit-1", "imaging-order-1"),
    ).resolves.toMatchObject({ ok: true, data: { id: "imaging-order-1" } });
    await expect(
      archiveMedicationOrder("visit-1", "med-order-1"),
    ).resolves.toMatchObject({ ok: true, data: { id: "med-order-1" } });

    expect(table.findLabOrder("lab-order-1")?.deletedAt).toBeInstanceOf(Date);
    expect(table.findImagingOrder("imaging-order-1")?.deletedAt).toBeInstanceOf(
      Date,
    );
    expect(table.findMedOrder("med-order-1")?.deletedAt).toBeInstanceOf(Date);
    expect(table.destroyed).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith("/visits/visit-1");
  });
});
