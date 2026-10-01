import { getPrisma } from "@/lib/prisma";
import {
  actionSuccess,
  internalFailure,
  knownFailure,
  type ActionFailure,
  type ActionFailureResult,
  type ActionResult,
} from "@/lib/action-result";
import { PERMISSIONS, authorize } from "@/server/access";
import { VISIT_CHECKED_OUT } from "./contract";
import {
  IMAGING_ORDER_NOT_FOUND,
  LAB_ORDER_NOT_FOUND,
  MEDICATION_ORDER_NOT_FOUND,
  ORDER_MEDICATION_NOT_FOUND,
  ORDER_VISIT_NOT_FOUND,
} from "./order-contract";

/**
 * Order write commands. A lab, imaging or medication request belongs to a visit,
 * so each command addresses the visit the page is on rather than trusting an id
 * in the body, requires a session holding the permission its change needs,
 * verifies that visit is still an active one for an active patient, and records
 * who ordered.
 *
 * Archiving an order keeps the row and leaves its status alone: the "Archive"
 * button means the order leaves normal clinical reads, not that the order was
 * ever cancelled. An archived order is retained history, so a retried archive
 * reports the same archive rather than a failure.
 */

export type LabOrderInput = {
  labType: string;
  notes: string | null;
};

export type ImagingOrderInput = {
  imagingType: string;
  notes: string | null;
};

export type MedicationOrderInput = {
  medicationId: string;
  dosage: string;
  frequency: string;
  route: string;
  notes: string | null;
};

export type OrderWriteResult = { id: string };

export type OrderArchiveResult = { id: string; archivedAt: string };

/**
 * `restoredAt` is null when the order was already active, so a retried restore
 * reports that there was no archive left to reverse.
 */
export type OrderRestoreResult = { id: string; restoredAt: string | null };

const ACTIVE_VISIT = {
  deletedAt: null,
  patient: { deletedAt: null },
} as const;

export async function requestLabOrder(
  visitId: string,
  input: LabOrderInput,
): Promise<ActionResult<OrderWriteResult>> {
  return requestOrder(visitId, getPrisma().labOrder, input);
}

export async function archiveLabOrder(
  visitId: string,
  orderId: string,
): Promise<ActionResult<OrderArchiveResult>> {
  return archiveOrder(visitId, getPrisma().labOrder, orderId, LAB_ORDER_NOT_FOUND);
}

export async function requestImagingOrder(
  visitId: string,
  input: ImagingOrderInput,
): Promise<ActionResult<OrderWriteResult>> {
  return requestOrder(visitId, getPrisma().imagingOrder, input);
}

export async function archiveImagingOrder(
  visitId: string,
  orderId: string,
): Promise<ActionResult<OrderArchiveResult>> {
  return archiveOrder(
    visitId,
    getPrisma().imagingOrder,
    orderId,
    IMAGING_ORDER_NOT_FOUND,
  );
}

export async function requestMedicationOrder(
  visitId: string,
  input: MedicationOrderInput,
): Promise<ActionResult<OrderWriteResult>> {
  return requestOrder(visitId, getPrisma().medicationOrder, input, onTheList);
}

export async function archiveMedicationOrder(
  visitId: string,
  orderId: string,
): Promise<ActionResult<OrderArchiveResult>> {
  return archiveOrder(
    visitId,
    getPrisma().medicationOrder,
    orderId,
    MEDICATION_ORDER_NOT_FOUND,
  );
}

export async function restoreLabOrder(
  visitId: string,
  orderId: string,
): Promise<ActionResult<OrderRestoreResult>> {
  return restoreOrder(visitId, getPrisma().labOrder, orderId, LAB_ORDER_NOT_FOUND);
}

export async function restoreImagingOrder(
  visitId: string,
  orderId: string,
): Promise<ActionResult<OrderRestoreResult>> {
  return restoreOrder(
    visitId,
    getPrisma().imagingOrder,
    orderId,
    IMAGING_ORDER_NOT_FOUND,
  );
}

export async function restoreMedicationOrder(
  visitId: string,
  orderId: string,
): Promise<ActionResult<OrderRestoreResult>> {
  return restoreOrder(
    visitId,
    getPrisma().medicationOrder,
    orderId,
    MEDICATION_ORDER_NOT_FOUND,
  );
}

/**
 * Requests an order of the addressed visit, whichever kind it is. The fields are
 * the order's own, so the model the request names is the only thing that differs
 * between a lab test, an imaging study and a medication.
 */
async function requestOrder<Fields extends object>(
  visitId: string,
  orders: OrderRequestTable<Fields>,
  fields: Fields,
  unmet?: (fields: Fields) => Promise<ActionFailure | null>,
): Promise<ActionResult<OrderWriteResult>> {
  const actor = await authorize(PERMISSIONS.ORDERS_WRITE);
  if (!actor.ok) return actor;

  const visit = await findActiveVisit(visitId);

  if (!visit) return knownFailure(ORDER_VISIT_NOT_FOUND);
  if (visit.endDateTime) return knownFailure(VISIT_CHECKED_OUT);

  const unmetBy = await unmet?.(fields);
  if (unmetBy) return knownFailure(unmetBy);

  try {
    const created = await orders.create({
      data: { visitId, orderedById: actor.data.user.id, ...fields },
    });

    return actionSuccess({ id: created.id });
  } catch (error) {
    return writeFailure(error);
  }
}

/** A medication order names a medication the pharmacy's catalogue still holds. */
async function onTheList(input: MedicationOrderInput): Promise<ActionFailure | null> {
  return (await isCatalogueMedication(input.medicationId))
    ? null
    : ORDER_MEDICATION_NOT_FOUND;
}

/**
 * Archives an order of the addressed visit. The visit in the path owns the
 * lookup, so an order placed during another visit is not reachable through it.
 */
async function archiveOrder(
  visitId: string,
  orders: OrderTable,
  orderId: string,
  notFound: ActionFailure,
): Promise<ActionResult<OrderArchiveResult>> {
  const actor = await authorize(PERMISSIONS.ORDERS_ARCHIVE);
  if (!actor.ok) return actor;

  const visit = await findActiveVisit(visitId);

  if (!visit) return knownFailure(ORDER_VISIT_NOT_FOUND);

  try {
    const order = await orders.findFirst({
      where: { id: orderId, visitId },
      select: { id: true, deletedAt: true },
    });

    if (!order) return knownFailure(notFound);

    // Checkout closes the visit to clinical writes before idempotence is
    // considered: once the visit is closed, no archival of it or its children is
    // accepted, not even one that would change nothing.
    if (visit.endDateTime) return knownFailure(VISIT_CHECKED_OUT);

    if (order.deletedAt) {
      return actionSuccess({
        id: order.id,
        archivedAt: order.deletedAt.toISOString(),
      });
    }

    const archivedAt = new Date();
    await orders.update({ where: { id: order.id }, data: { deletedAt: archivedAt } });

    return actionSuccess({
      id: order.id,
      archivedAt: archivedAt.toISOString(),
    });
  } catch (error) {
    return writeFailure(error);
  }
}

/**
 * Reverses an archive: the order returns to the visit it was requested against.
 *
 * Idempotent, like archiving is. Like archiving it also insists on the visit in
 * the path being an active one for an active patient, so an order cannot be
 * restored into a visit that is itself out of the way — the archive is unwound
 * from the top down, visit before order. A restored order keeps its status: an
 * archived order was never cancelled, so restoring it does not cancel it now.
 *
 * Only an administrator restores: an archive is how the clinic takes a mistake or
 * a record it must not keep in the way, and the role that may archive an order is
 * not thereby trusted to bring one back.
 */
async function restoreOrder(
  visitId: string,
  orders: OrderTable,
  orderId: string,
  notFound: ActionFailure,
): Promise<ActionResult<OrderRestoreResult>> {
  const actor = await authorize(PERMISSIONS.ORDERS_RESTORE);
  if (!actor.ok) return actor;

  const visit = await findActiveVisit(visitId);

  if (!visit) return knownFailure(ORDER_VISIT_NOT_FOUND);

  try {
    // The visit in the path owns the lookup, and it ignores `deletedAt` on
    // purpose: an archived order is precisely the row this command is here to find.
    const order = await orders.findFirst({
      where: { id: orderId, visitId },
      select: { id: true, deletedAt: true },
    });

    if (!order) return knownFailure(notFound);

    if (!order.deletedAt) {
      return actionSuccess({ id: order.id, restoredAt: null });
    }

    const restoredAt = new Date();
    await orders.update({ where: { id: order.id }, data: { deletedAt: null } });

    return actionSuccess({ id: order.id, restoredAt: restoredAt.toISOString() });
  } catch (error) {
    return writeFailure(error);
  }
}

/** The shape of an order model this command needs, whichever kind it holds. */
type OrderTable = {
  findFirst: (args: {
    where: { id: string; visitId: string };
    select: { id: true; deletedAt: true };
  }) => Promise<{ id: string; deletedAt: Date | null } | null>;
  update: (args: {
    where: { id: string };
    data: { deletedAt: Date | null };
  }) => Promise<unknown>;
};

/** The shape of an order model a request writes, whichever kind it holds. */
type OrderRequestTable<Fields> = {
  create: (args: {
    data: { visitId: string; orderedById: string } & Fields;
  }) => Promise<{ id: string }>;
};

async function findActiveVisit(visitId: string) {
  return getPrisma().visit.findFirst({
    where: { id: visitId, ...ACTIVE_VISIT },
    select: { id: true, endDateTime: true },
  });
}

/** A medication order names a medication the pharmacy's catalogue still holds. */
async function isCatalogueMedication(medicationId: string): Promise<boolean> {
  const medication = await getPrisma().medication.findFirst({
    where: { id: medicationId, deletedAt: null },
    select: { id: true },
  });

  return medication != null;
}

function writeFailure(error: unknown): ActionFailureResult {
  console.error("Order write failed:", error);

  return internalFailure();
}
