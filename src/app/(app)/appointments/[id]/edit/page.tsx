"use client";
import { useClinicTimeZone } from "@/components/clinic-time-zone-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toDateTimeLocalValue } from "@/lib/clinic-time";
import { useRouter } from "next/navigation";
import { use, useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateAppointment } from "@/app/actions/appointment-actions";
import { useAppointmentDetail } from "@/client/appointments/queries";

type AppointmentActionState = Awaited<
  ReturnType<typeof updateAppointment>
> | null;

const EditAppointmentPage = ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  // The clinic's zone, read from the server-rendered tree: a client component
  // cannot read `process.env`, so it is handed down. See ADR 0004.
  const zone = useClinicTimeZone();

  const router = useRouter();
  const { id } = use(params);
  const { isPending, isError, data: appointment } = useAppointmentDetail(id);
  const [result, submit, isSubmitting] = useActionState(
    async (_previous: AppointmentActionState, formData: FormData) =>
      updateAppointment(formData),
    null,
  );

  if (isPending) {
    return (
      <div className="flex justify-center items-center h-40">
        <p>Loading appointment...</p>
      </div>
    );
  }

  if (isError || !appointment) {
    return (
      <div className="flex justify-center items-center h-40">
        <p className="text-red-600">Appointment not found</p>
      </div>
    );
  }

  const fieldError = (field: string) =>
    result && !result.ok && result.error.fieldErrors?.[field]
      ? result.error.fieldErrors[field][0]
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Edit Appointment</h1>
      </div>

      <Card className="mb-8">
        <CardContent>
          <form action={submit} className="space-y-12">
            <input type="hidden" name="id" value={appointment.id} />

            <div className="grid md:grid-cols-2 gap-8">
              <div className="grid gap-3">
                <Label htmlFor="patient">Patient</Label>
                <Input
                  id="patient"
                  value={`${appointment.patient.firstName} ${appointment.patient.middleName} ${appointment.patient.lastName}`}
                  disabled
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="provider">Provider</Label>
                <Input
                  id="provider"
                  // A provider who exists is the provider, whatever their role;
                  // "Unassigned" is the truth only when there is nobody assigned.
                  value={appointment.provider?.name ?? "Unassigned"}
                  disabled
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="grid gap-3">
                <Label htmlFor="startDateTime">
                  Start Date<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startDateTime"
                  name="startDateTime"
                  type="datetime-local"
                  required
                  defaultValue={toDateTimeLocalValue(appointment.startDateTime, zone)}
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="endDateTime">
                  End Date<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endDateTime"
                  name="endDateTime"
                  type="datetime-local"
                  required
                  defaultValue={toDateTimeLocalValue(appointment.endDateTime, zone)}
                />
                {fieldError("endDateTime") && (
                  <p className="text-sm text-red-600">
                    {fieldError("endDateTime")}
                  </p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="grid gap-3">
                <Label htmlFor="appointmentType">
                  Type<span className="text-red-500">*</span>
                </Label>
                <Select
                  name="appointmentType"
                  required
                  defaultValue={appointment.appointmentType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMISSION">Admission</SelectItem>
                    <SelectItem value="CLINIC">Clinic</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    <SelectItem value="FOLLOWUP">Follow-up</SelectItem>
                    <SelectItem value="IMAGING">Imaging</SelectItem>
                    <SelectItem value="LAB">Lab</SelectItem>
                    <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="appointmentStatus">Status</Label>
                <Select
                  name="appointmentStatus"
                  defaultValue={appointment.appointmentStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATTENDED">Attended</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="MISSED">Missed</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  defaultValue={appointment.reason ?? ""}
                />
              </div>
            </div>

            {result && !result.ok && (
              <p className="text-red-600">{result.error.message}</p>
            )}

            <Button type="submit" className="mt-4 mr-2" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Appointment"}
            </Button>
            <Button type="button" onClick={() => router.back()}>
              Back
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditAppointmentPage;
