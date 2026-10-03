"use client";
import { useClinicTimeZone } from "@/components/clinic-time-zone-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatClinicDateTime } from "@/lib/clinic-time";
import { useRouter } from "next/navigation";
import { use, useActionState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requestLabOrder } from "@/app/actions/order-actions";
import { invalidateVisitWrites, useVisitDetail } from "@/client/visits/queries";
import { visitPage } from "@/server/visits/contract";

type LabOrderActionState = Awaited<ReturnType<typeof requestLabOrder>> | null;

/**
 * A lab request belongs to the visit the page is on, so the visit is named by the
 * page rather than chosen here, and the new order is read back from that visit.
 */
const AddLabRequest = ({ params }: { params: Promise<{ id: string }> }) => {
  // The clinic's zone, read from the server-rendered tree: a client component
  // cannot read `process.env`, so it is handed down. See ADR 0004.
  const zone = useClinicTimeZone();

  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const { data: visit, isPending, isError } = useVisitDetail(id);

  // The action reports rather than redirecting, so the visit carrying the new
  // order is re-read before the page moves back to it.
  const [result, submit, isSubmitting] = useActionState(
    async (_previous: LabOrderActionState, formData: FormData) => {
      const outcome = await requestLabOrder(formData);

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
        <h1 className="text-2xl font-bold my-2">Lab Request</h1>
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
                <Label htmlFor="visit">Visit</Label>
                <Input
                  id="visit"
                  value={`${formatClinicDateTime(visit.startDateTime, zone)} - ${visit.visitType}`}
                  disabled
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="grid gap-3">
                <Label htmlFor="labType">
                  Lab Type<span className="text-red-500">*</span>
                </Label>
                <Input id="labType" name="labType" placeholder="" required />
                {fieldError("labType") && (
                  <p className="text-sm text-red-600">{fieldError("labType")}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" placeholder="" />
              </div>
            </div>

            {result && !result.ok && (
              <p className="text-red-600">{result.error.message}</p>
            )}

            <Button type="submit" className="mt-4 mr-2" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Request"}
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

export default AddLabRequest;
