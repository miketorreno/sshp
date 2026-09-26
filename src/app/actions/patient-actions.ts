"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  actionFailure,
  FAILURE_CODES,
  parseSubmission,
  type ActionResult,
} from "@/lib/action-result";
import { PATIENT_LIST_PAGE } from "@/server/patients/contract";
import {
  createPatient as createPatientCommand,
  deletePatient as deletePatientCommand,
  updatePatient as updatePatientCommand,
  type PatientArchiveResult,
  type PatientWriteResult,
} from "@/server/patients/commands";
import {
  patientInputFromFormData,
  patientInputSchema,
} from "@/server/patients/schema";

/**
 * Form commands for patients. They own the form contract: parse and validate
 * the submission, run the command, revalidate the affected page, and redirect
 * on success. Failures come back as results so the form can show them.
 */

export async function createPatient(
  formData: FormData,
): Promise<ActionResult<PatientWriteResult>> {
  const submission = parsePatientForm(formData);

  if (!submission.ok) return submission;

  const result = await createPatientCommand(submission.input);

  if (!result.ok) return result;

  revalidatePath(PATIENT_LIST_PAGE);
  redirect(patientPage(result.data.id));
}

export async function updatePatient(
  formData: FormData,
): Promise<ActionResult<PatientWriteResult>> {
  const patientId = formData.get("id");

  if (typeof patientId !== "string" || !patientId) {
    return actionFailure(FAILURE_CODES.INVALID_INPUT, {
      fieldErrors: { id: ["Select a patient to update"] },
    });
  }

  const submission = parsePatientForm(formData);

  if (!submission.ok) return submission;

  const result = await updatePatientCommand(patientId, submission.input);

  if (!result.ok) return result;

  revalidatePath(PATIENT_LIST_PAGE);
  redirect(patientPage(result.data.id));
}

/**
 * Archiving is not a form submission, so it reports instead of redirecting: the
 * caller stays where it is and invalidates the reads the archive changed.
 */
export async function deletePatient(
  patientId: string,
): Promise<ActionResult<PatientArchiveResult>> {
  const result = await deletePatientCommand(patientId);

  if (!result.ok) return result;

  revalidatePath(PATIENT_LIST_PAGE);

  return result;
}

/** Parses a patient submission, or returns the failure the form should show. */
function parsePatientForm(formData: FormData) {
  return parseSubmission(
    patientInputSchema,
    patientInputFromFormData(formData),
  );
}

function patientPage(patientId: string) {
  return `/patients/${patientId}`;
}
