"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  actionFailure,
  FAILURE_CODES,
  parseSubmission,
  type ActionResult,
} from "@/lib/action-result";
import {
  APPOINTMENT_CALENDAR_PAGE,
  APPOINTMENT_LIST_PAGE,
} from "@/server/appointments/contract";
import {
  checkInAppointment as checkInAppointmentCommand,
  createAppointment as createAppointmentCommand,
  deleteAppointment as deleteAppointmentCommand,
  updateAppointment as updateAppointmentCommand,
  type AppointmentArchiveResult,
  type AppointmentWriteResult,
  type CheckInResult,
} from "@/server/appointments/commands";
import {
  createAppointmentInputFromFormData,
  createAppointmentSchema,
  updateAppointmentInputFromFormData,
  updateAppointmentSchema,
} from "@/server/appointments/schema";

/**
 * Form commands for appointments. They own the form contract: parse and validate
 * the submission, run the command, revalidate the affected pages, and redirect
 * on success. Failures come back as results so the form can show them.
 */

export async function createAppointment(
  formData: FormData,
): Promise<ActionResult<AppointmentWriteResult>> {
  const submission = parseSubmission(
    createAppointmentSchema,
    createAppointmentInputFromFormData(formData),
  );

  if (!submission.ok) return submission;

  const result = await createAppointmentCommand(submission.input);

  if (!result.ok) return result;

  revalidateAppointmentPages();
  redirect(appointmentPage(result.data.id));
}

export async function updateAppointment(
  formData: FormData,
): Promise<ActionResult<AppointmentWriteResult>> {
  const appointmentId = formData.get("id");

  if (typeof appointmentId !== "string" || !appointmentId) {
    return actionFailure(FAILURE_CODES.INVALID_INPUT, {
      fieldErrors: { id: ["Select an appointment to update"] },
    });
  }

  const submission = parseSubmission(
    updateAppointmentSchema,
    updateAppointmentInputFromFormData(formData),
  );

  if (!submission.ok) return submission;

  const result = await updateAppointmentCommand(
    appointmentId,
    submission.input,
  );

  if (!result.ok) return result;

  revalidateAppointmentPages();
  redirect(appointmentPage(result.data.id));
}

/**
 * Archiving is not a form submission, so it reports instead of redirecting: the
 * caller stays where it is and invalidates the reads the archive changed.
 */
export async function deleteAppointment(
  appointmentId: string,
): Promise<ActionResult<AppointmentArchiveResult>> {
  const result = await deleteAppointmentCommand(appointmentId);

  if (!result.ok) return result;

  revalidateAppointmentPages();

  return result;
}

/**
 * A check-in ends in the visit it opened, so it reports a failure and otherwise
 * navigates to that visit.
 */
export async function checkInAppointment(
  appointmentId: string,
): Promise<ActionResult<CheckInResult>> {
  const result = await checkInAppointmentCommand(appointmentId);

  if (!result.ok) return result;

  revalidateAppointmentPages();
  redirect(`/visits/${result.data.visitId}`);
}

function revalidateAppointmentPages() {
  revalidatePath(APPOINTMENT_LIST_PAGE);
  revalidatePath(APPOINTMENT_CALENDAR_PAGE);
}

function appointmentPage(appointmentId: string) {
  return `/appointments/${appointmentId}`;
}
