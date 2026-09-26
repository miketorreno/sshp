"use client";
import { useActionState, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAppointment } from "@/app/actions/appointment-actions";
import { PatientCombobox } from "@/components/patient-combobox";
import type { PatientSummaryDto } from "@/server/patients/dto";

const AddAppointmentPage = () => {
  const [patientId, setPatientId] = useState("");
  const [result, submit, isSubmitting] = useActionState(
    async (
      _previous: Awaited<ReturnType<typeof createAppointment>> | null,
      formData: FormData
    ) => createAppointment(formData),
    null
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Add Appointment</h1>
      </div>

      <Card>
        <CardContent>
          <form action={submit} className="space-y-12">
            <input type="hidden" name="patientId" value={patientId} />

            <div className="grid md:grid-cols-2 gap-8">
              <div className="grid gap-3">
                <PatientCombobox
                  defaultValue={null}
                  onSelectChange={(patient: PatientSummaryDto | null) =>
                    setPatientId(patient?.id ?? "")
                  }
                />
                {result?.ok === false && result.error.fieldErrors?.patientId && (
                  <p className="text-sm text-red-600">
                    {result.error.fieldErrors.patientId[0]}
                  </p>
                )}
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
                />
                {result?.ok === false &&
                  result.error.fieldErrors?.endDateTime && (
                    <p className="text-sm text-red-600">
                      {result.error.fieldErrors.endDateTime[0]}
                    </p>
                  )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="grid gap-3">
                <Label htmlFor="appointmentType">
                  Type<span className="text-red-500">*</span>
                </Label>
                <Select name="appointmentType" required>
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
                <Select name="appointmentStatus" defaultValue="SCHEDULED">
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
                <Textarea id="reason" name="reason" placeholder="" />
              </div>
            </div>

            {result && !result.ok && (
              <p className="text-red-600">{result.error.message}</p>
            )}

            <Button type="submit" className="mt-4" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Appointment"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddAppointmentPage;
