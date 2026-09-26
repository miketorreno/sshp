"use client";
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
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createVisit } from "@/app/actions/visit-actions";
import { invalidateVisitWrites } from "@/client/visits/queries";
import { visitPage } from "@/server/visits/contract";
import { PatientCombobox } from "@/components/patient-combobox";
import type { PatientSummaryDto } from "@/server/patients/dto";

/**
 * Checking someone in is opening a visit for a patient who is already on file, so
 * the form names the patient and the time; the visit is attributed to the
 * signed-in staff member by the command.
 */
const CheckInPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [patientId, setPatientId] = useState("");

  // The action reports rather than redirecting, so the clinic day the new visit
  // joins is invalidated before the page moves on to the visit it opened.
  const [result, submit, isSubmitting] = useActionState(
    async (
      _previous: Awaited<ReturnType<typeof createVisit>> | null,
      formData: FormData,
    ) => {
      const outcome = await createVisit(formData);

      if (outcome.ok) {
        await invalidateVisitWrites(queryClient, outcome.data.id);
        router.push(visitPage(outcome.data.id));
      }

      return outcome;
    },
    null,
  );

  const fieldError = (field: string) =>
    result && !result.ok && result.error.fieldErrors?.[field]
      ? result.error.fieldErrors[field][0]
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Patient Check In</h1>
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
                {fieldError("patientId") && (
                  <p className="text-sm text-red-600">
                    {fieldError("patientId")}
                  </p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="examiner">Examiner</Label>
                <Input id="examiner" placeholder="" disabled />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="grid gap-3">
                <Label htmlFor="startDateTime">
                  Check In<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startDateTime"
                  name="startDateTime"
                  type="datetime-local"
                  required
                />
                {fieldError("startDateTime") && (
                  <p className="text-sm text-red-600">
                    {fieldError("startDateTime")}
                  </p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="visitType">
                  Type<span className="text-red-500">*</span>
                </Label>
                <Select name="visitType" required>
                  <SelectTrigger>
                    <SelectValue placeholder="" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLINIC">Clinic</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    <SelectItem value="FOLLOWUP">Follow-up</SelectItem>
                    <SelectItem value="IMAGING">Imaging</SelectItem>
                    <SelectItem value="LAB">Lab</SelectItem>
                    <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                  </SelectContent>
                </Select>
                {fieldError("visitType") && (
                  <p className="text-sm text-red-600">
                    {fieldError("visitType")}
                  </p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="reason">Reason</Label>
                <Textarea id="reason" name="reason" placeholder="" />
                {fieldError("reason") && (
                  <p className="text-sm text-red-600">{fieldError("reason")}</p>
                )}
              </div>
            </div>

            {result && !result.ok && (
              <p className="text-red-600">{result.error.message}</p>
            )}

            <Button type="submit" className="mt-4" disabled={isSubmitting}>
              {isSubmitting ? "Checking in..." : "Check-in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckInPage;
