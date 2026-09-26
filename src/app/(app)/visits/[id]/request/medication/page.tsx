"use client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { use, useActionState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requestMedicationOrder } from "@/app/actions/order-actions";
import { useMedications } from "@/client/medications/queries";
import { invalidateVisitWrites, useVisitDetail } from "@/client/visits/queries";
import { visitPage } from "@/server/visits/contract";

type MedicationOrderActionState =
  | Awaited<ReturnType<typeof requestMedicationOrder>>
  | null;

/**
 * A medication request names a medication from the pharmacy's catalogue, so the
 * order records what was chosen rather than a name typed free-hand. The request
 * belongs to the visit the page is on, and the new order is read back from it.
 */
const AddMedicationRequest = ({ params }: { params: Promise<{ id: string }> }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const { data: visit, isPending, isError } = useVisitDetail(id);
  const { data: medications, isPending: isLoadingMedications } = useMedications();

  // The action reports rather than redirecting, so the visit carrying the new
  // order is re-read before the page moves back to it.
  const [result, submit, isSubmitting] = useActionState(
    async (_previous: MedicationOrderActionState, formData: FormData) => {
      const outcome = await requestMedicationOrder(formData);

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
        <h1 className="text-2xl font-bold my-2">Medication Request</h1>
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
                  value={`${formatDateTime(visit.startDateTime)} - ${visit.visitType}`}
                  disabled
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="grid gap-3">
                <Label htmlFor="medicationId">
                  Medication<span className="text-red-500">*</span>
                </Label>
                <Select name="medicationId">
                  <SelectTrigger id="medicationId" className="w-full">
                    <SelectValue
                      placeholder={
                        isLoadingMedications
                          ? "Loading medications..."
                          : "Select a medication"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {medications?.map((medication) => (
                      <SelectItem key={medication.id} value={medication.id}>
                        {medication.name}
                        {medication.brandName
                          ? ` (${medication.brandName})`
                          : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError("medicationId") && (
                  <p className="text-sm text-red-600">
                    {fieldError("medicationId")}
                  </p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" placeholder="" />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="dosage">
                  Dosage<span className="text-red-500">*</span>
                </Label>
                <Input id="dosage" name="dosage" placeholder="500mg" required />
                {fieldError("dosage") && (
                  <p className="text-sm text-red-600">{fieldError("dosage")}</p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="frequency">
                  Frequency<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="frequency"
                  name="frequency"
                  placeholder="Twice a day"
                  required
                />
                {fieldError("frequency") && (
                  <p className="text-sm text-red-600">
                    {fieldError("frequency")}
                  </p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="route">
                  Route<span className="text-red-500">*</span>
                </Label>
                <Input id="route" name="route" placeholder="Oral" required />
                {fieldError("route") && (
                  <p className="text-sm text-red-600">{fieldError("route")}</p>
                )}
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

export default AddMedicationRequest;
