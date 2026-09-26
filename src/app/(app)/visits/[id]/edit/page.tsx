"use client";
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
import { formatFetchedLocalDateTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { use, useActionState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateVisit } from "@/app/actions/visit-actions";
import { invalidateVisitWrites, useVisitDetail } from "@/client/visits/queries";
import { visitPage } from "@/server/visits/contract";

type VisitActionState = Awaited<ReturnType<typeof updateVisit>> | null;

/**
 * Editing a visit changes how the visit reads, never who it is for: the patient
 * and the provider are shown rather than offered as choices. A checked-out visit
 * is history, so it has nothing to edit.
 */
const EditVisitPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const { data: visit, isPending, isError } = useVisitDetail(id);

  // The action reports rather than redirecting, so the reads the edit changed are
  // invalidated before the page moves on to the visit it edited.
  const [result, submit, isSubmitting] = useActionState(
    async (_previous: VisitActionState, formData: FormData) => {
      const outcome = await updateVisit(formData);

      if (outcome.ok) {
        await invalidateVisitWrites(queryClient, id);
        router.push(visitPage(id));
      }

      return outcome;
    },
    null,
  );

  if (isPending) {
    return (
      <div className="flex justify-center items-center h-40">
        <p>Loading visit...</p>
      </div>
    );
  }

  if (isError || !visit) {
    return (
      <div className="flex justify-center items-center h-40">
        <p className="text-red-600">Visit not found</p>
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
        <h1 className="text-2xl font-bold my-2">Edit Visit</h1>
      </div>

      <Card className="mb-8">
        <CardContent>
          <form action={submit} className="space-y-12">
            <input type="hidden" name="id" value={visit.id} />

            <div className="grid md:grid-cols-2 gap-8">
              <div className="grid gap-3">
                <Label htmlFor="patient">Patient</Label>
                <Input
                  id="patient"
                  value={`${visit.patient.firstName} ${visit.patient.middleName} ${visit.patient.lastName}`}
                  disabled
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="provider">Provider</Label>
                <Input
                  id="provider"
                  value={visit.provider ? visit.provider.name : "Unassigned"}
                  disabled
                />
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
                  defaultValue={formatFetchedLocalDateTime(visit.startDateTime)}
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
                <Select
                  name="visitType"
                  required
                  defaultValue={visit.visitType}
                >
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
                <Textarea
                  id="reason"
                  name="reason"
                  defaultValue={visit.reason ?? ""}
                />
                {fieldError("reason") && (
                  <p className="text-sm text-red-600">{fieldError("reason")}</p>
                )}
              </div>
            </div>

            {result && !result.ok && (
              <p className="text-red-600">{result.error.message}</p>
            )}

            <Button type="submit" className="mt-4 mr-2" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Visit"}
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

export default EditVisitPage;
