"use server";
import { revalidatePath } from "next/cache";
import {
  actionFailure,
  FAILURE_CODES,
  parseSubmission,
  type ActionResult,
} from "@/lib/action-result";
import { OUTPATIENTS_PAGE, visitPage } from "@/server/visits/contract";
import {
  checkoutVisit as checkoutVisitCommand,
  createVisit as createVisitCommand,
  archiveVisit as archiveVisitCommand,
  updateVisit as updateVisitCommand,
  type VisitArchiveResult,
  type VisitWriteResult,
} from "@/server/visits/commands";
import {
  createVisitInputFromFormData,
  createVisitSchema,
  updateVisitInputFromFormData,
  updateVisitSchema,
} from "@/server/visits/schema";

/**
 * Form commands for visits. They own the form contract: parse and validate the
 * submission, run the command, revalidate the affected pages, and report the
 * result. Failures come back as results so the form can show them.
 *
 * A form action reports rather than redirecting, because the caller is a client
 * component holding cached reads: it invalidates the reads the write changed and
 * then navigates, so nothing it already has on screen outlives the write.
 *
 * A visit write always revalidates Today's Outpatients, because that list is the
 * clinic day a visit appears in, and the visit's own page.
 */

/** Checking someone in is opening a visit for a patient named by the form. */
export async function createVisit(
  formData: FormData,
): Promise<ActionResult<VisitWriteResult>> {
  const submission = parseSubmission(
    createVisitSchema,
    createVisitInputFromFormData(formData),
  );

  if (!submission.ok) return submission;

  const result = await createVisitCommand(submission.input);

  if (!result.ok) return result;

  revalidateVisitPages(result.data.id);

  return result;
}

/**
 * Editing a visit changes how the visit reads, never who it is for, so the
 * submission carries the visit it edits and nothing else about its identity. The
 * command treats that visit as the authoritative one.
 */
export async function updateVisit(
  formData: FormData,
): Promise<ActionResult<VisitWriteResult>> {
  const visitId = formData.get("id");

  if (typeof visitId !== "string" || !visitId) {
    return actionFailure(FAILURE_CODES.INVALID_INPUT, {
      fieldErrors: { id: ["Select a visit to update"] },
    });
  }

  const submission = parseSubmission(
    updateVisitSchema,
    updateVisitInputFromFormData(formData),
  );

  if (!submission.ok) return submission;

  const result = await updateVisitCommand(visitId, submission.input);

  if (!result.ok) return result;

  revalidateVisitPages(visitId);

  return result;
}

/**
 * Checking out is a button rather than a form submission, so it reports too: the
 * caller stays on the visit and invalidates the reads the checkout changed.
 */
export async function checkoutVisit(
  visitId: string,
): Promise<ActionResult<VisitWriteResult>> {
  const result = await checkoutVisitCommand(visitId);

  if (!result.ok) return result;

  revalidateVisitPages(visitId);

  return result;
}

/**
 * Archiving is a button rather than a form submission: it reports the archive so
 * the caller can invalidate the reads it changed.
 */
export async function archiveVisit(
  visitId: string,
): Promise<ActionResult<VisitArchiveResult>> {
  const result = await archiveVisitCommand(visitId);

  if (!result.ok) return result;

  revalidateVisitPages(visitId);

  return result;
}

/** A visit shows in the clinic day, and in itself. */
function revalidateVisitPages(visitId: string) {
  revalidatePath(OUTPATIENTS_PAGE);
  revalidatePath(visitPage(visitId));
}
