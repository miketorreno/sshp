"use server";
import type { ZodType } from "zod";
import { revalidatePath } from "next/cache";
import {
  actionFailure,
  FAILURE_CODES,
  parseSubmission,
  type ActionResult,
} from "@/lib/action-result";
import { visitPage } from "@/server/visits/contract";
import {
  archiveImagingOrder as archiveImagingOrderCommand,
  archiveLabOrder as archiveLabOrderCommand,
  archiveMedicationOrder as archiveMedicationOrderCommand,
  requestImagingOrder as requestImagingOrderCommand,
  requestLabOrder as requestLabOrderCommand,
  requestMedicationOrder as requestMedicationOrderCommand,
  type ImagingOrderInput,
  type LabOrderInput,
  type MedicationOrderInput,
  type OrderArchiveResult,
  type OrderWriteResult,
} from "@/server/visits/order-commands";
import {
  requestImagingOrderInputFromFormData,
  requestImagingOrderSchema,
  requestLabOrderInputFromFormData,
  requestLabOrderSchema,
  requestMedicationOrderInputFromFormData,
  requestMedicationOrderSchema,
} from "@/server/visits/schema";

/**
 * Form commands for the lab, imaging and medication requests made during a visit.
 * They own the form contract: parse and validate the submission, run the command,
 * revalidate the visit the order is read in, and report the result.
 *
 * The visit in the path owns the order, so the form names the visit it is
 * ordering for and nothing else about which record is being written. All six
 * commands report rather than redirecting, so the client holding cached reads can
 * invalidate them before it navigates.
 */

/** Requesting an order ends on the visit, where the new order is read. */
export async function requestLabOrder(formData: FormData) {
  return requestOrder(LAB_REQUEST, formData);
}

export async function requestImagingOrder(formData: FormData) {
  return requestOrder(IMAGING_REQUEST, formData);
}

/**
 * A medication request names the medication it orders, so what a clinician chose
 * from the pharmacy's catalogue is what the order holds.
 */
export async function requestMedicationOrder(formData: FormData) {
  return requestOrder(MEDICATION_REQUEST, formData);
}

/** What one kind of order request submits, names and runs. */
type OrderRequest<Input> = {
  ordering: string;
  schema: ZodType<Input>;
  submitted: (formData: FormData) => unknown;
  command: (
    visitId: string,
    input: Input,
  ) => Promise<ActionResult<OrderWriteResult>>;
};

const LAB_REQUEST: OrderRequest<LabOrderInput> = {
  ordering: "a lab test",
  schema: requestLabOrderSchema,
  submitted: requestLabOrderInputFromFormData,
  command: requestLabOrderCommand,
};

const IMAGING_REQUEST: OrderRequest<ImagingOrderInput> = {
  ordering: "an imaging study",
  schema: requestImagingOrderSchema,
  submitted: requestImagingOrderInputFromFormData,
  command: requestImagingOrderCommand,
};

const MEDICATION_REQUEST: OrderRequest<MedicationOrderInput> = {
  ordering: "a medication",
  schema: requestMedicationOrderSchema,
  submitted: requestMedicationOrderInputFromFormData,
  command: requestMedicationOrderCommand,
};

/**
 * One form path for every kind of request: the form names the visit, the order
 * names itself, and the result is reported so the caller can re-read the visit.
 */
async function requestOrder<Input>(
  request: OrderRequest<Input>,
  formData: FormData,
): Promise<ActionResult<OrderWriteResult>> {
  const visit = visitAddressedBy(formData, request.ordering);
  if (!visit.ok) return visit;

  const submission = parseSubmission(
    request.schema,
    request.submitted(formData),
  );

  if (!submission.ok) return submission;

  const result = await request.command(visit.id, submission.input);

  return revalidated(result, visit.id);
}

/**
 * Archiving an order is a button rather than a form submission: it reports the
 * archive so the caller can invalidate the reads it changed.
 */
export async function archiveLabOrder(
  visitId: string,
  orderId: string,
): Promise<ActionResult<OrderArchiveResult>> {
  const result = await archiveLabOrderCommand(visitId, orderId);

  return revalidated(result, visitId);
}

export async function archiveImagingOrder(
  visitId: string,
  orderId: string,
): Promise<ActionResult<OrderArchiveResult>> {
  const result = await archiveImagingOrderCommand(visitId, orderId);

  return revalidated(result, visitId);
}

export async function archiveMedicationOrder(
  visitId: string,
  orderId: string,
): Promise<ActionResult<OrderArchiveResult>> {
  const result = await archiveMedicationOrderCommand(visitId, orderId);

  return revalidated(result, visitId);
}

/** The visit an order form is for, which the path rather than the body owns. */
function visitAddressedBy(formData: FormData, ordering: string) {
  const visitId = formData.get("id");

  if (typeof visitId === "string" && visitId)
    return { ok: true, id: visitId } as const;

  return actionFailure(FAILURE_CODES.INVALID_INPUT, {
    fieldErrors: { id: [`Choose the visit to order ${ordering}`] },
  });
}

/** Orders are read inside their visit, so a successful write revalidates it. */
function revalidated<T>(
  result: ActionResult<T>,
  visitId: string,
): ActionResult<T> {
  if (!result.ok) return result;

  revalidatePath(visitPage(visitId));

  return result;
}
