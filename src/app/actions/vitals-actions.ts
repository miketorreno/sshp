"use server";
import { revalidatePath } from "next/cache";
import {
  actionFailure,
  FAILURE_CODES,
  parseSubmission,
  type ActionResult,
} from "@/lib/action-result";
import { visitPage } from "@/server/visits/contract";
import {
  archiveVitals as archiveVitalsCommand,
  restoreVitals as restoreVitalsCommand,
  recordVitals as recordVitalsCommand,
  type VitalsArchiveResult,
  type VitalsRestoreResult,
  type VitalsWriteResult,
} from "@/server/visits/vitals-commands";
import {
  recordVitalsInputFromFormData,
  recordVitalsSchema,
} from "@/server/visits/schema";

/**
 * Form commands for the vitals recorded inside a visit. They own the form
 * contract: parse and validate the submission, run the command, revalidate the
 * visit the reading is read in, and report the result.
 *
 * The visit in the path owns the recording, so the form names the visit it is
 * recording for and nothing else about which record is being written. Both
 * commands report rather than redirecting, so the client holding cached reads can
 * invalidate them before it navigates.
 */

/** Recording vitals ends on the visit, where the new reading is read. */
export async function addVitals(
  formData: FormData,
): Promise<ActionResult<VitalsWriteResult>> {
  const visitId = formData.get("id");

  if (typeof visitId !== "string" || !visitId) {
    return actionFailure(FAILURE_CODES.INVALID_INPUT, {
      fieldErrors: { id: ["Select a visit to record vitals for"] },
    });
  }

  const submission = parseSubmission(
    recordVitalsSchema,
    recordVitalsInputFromFormData(formData),
  );

  if (!submission.ok) return submission;

  const result = await recordVitalsCommand({
    visitId,
    ...submission.input,
  });

  if (!result.ok) return result;

  revalidatePath(visitPage(visitId));

  return result;
}

/**
 * Reported rather than redirected, because the caller is the archive and stays in it.
 *
 * A reading is addressed by its visit as well as its own id, so both travel here; a
 * reading whose visit is still archived is refused by the command, and the archive
 * screen already names the visit to restore first.
 */
export async function restoreVitals(
  visitId: string,
  vitalsId: string,
): Promise<ActionResult<VitalsRestoreResult>> {
  const result = await restoreVitalsCommand(visitId, vitalsId);

  if (!result.ok) return result;

  revalidatePath(visitPage(visitId));

  return result;
}

/**
 * Archiving vitals is a button rather than a form submission: it reports the
 * archive so the caller can invalidate the reads it changed.
 */
export async function archiveVitals(
  visitId: string,
  vitalsId: string,
): Promise<ActionResult<VitalsArchiveResult>> {
  const result = await archiveVitalsCommand(visitId, vitalsId);

  if (!result.ok) return result;

  revalidatePath(visitPage(visitId));

  return result;
}
