"use client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatFetchedLocalDateTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { use, useActionState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { addVitals } from "@/app/actions/vitals-actions";
import { invalidateVisitWrites, useVisitDetail } from "@/client/visits/queries";
import { visitPage } from "@/server/visits/contract";

type VitalsActionState = Awaited<ReturnType<typeof addVitals>> | null;

/** The readings a clinician fills in when taking a set of vitals. */
const MEASUREMENTS = [
  { name: "height", label: "Height (cm)" },
  { name: "weight", label: "Weight (kg)" },
  { name: "systolicBP", label: "Systolic" },
  { name: "diastolicBP", label: "Diastolic" },
  { name: "heartRate", label: "Heart Rate" },
  { name: "temperatureCelsius", label: "Temperature (°C)" },
  { name: "respiratoryRate", label: "Respiratory Rate" },
  { name: "oxygenSaturation", label: "Oxygen Saturation" },
  { name: "glucose", label: "Glucose" },
  { name: "cholesterol", label: "Cholesterol" },
] as const;

/**
 * Recording vitals is a measurement taken during one visit, so the visit is
 * named by the page rather than chosen here. A box left blank records no reading;
 * a box holding a zero records a zero.
 */
const AddVitalsPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const { data: visit, isPending, isError } = useVisitDetail(id);

  // The action reports rather than redirecting, so the visit carrying the new
  // reading is re-read before the page moves back to it.
  const [result, submit, isSubmitting] = useActionState(
    async (_previous: VitalsActionState, formData: FormData) => {
      const outcome = await addVitals(formData);

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
        <h1 className="text-2xl font-bold my-2">Add Vitals</h1>
      </div>

      <Card className="mb-8">
        <CardContent>
          <form action={submit} className="space-y-12">
            <input type="hidden" name="id" value={visit.id} />

            <div className="grid md:grid-cols-3 gap-8">
              <div className="grid gap-3">
                <Label htmlFor="patient">Patient</Label>
                <Input
                  id="patient"
                  value={`${visit.patient.firstName} ${visit.patient.middleName} ${visit.patient.lastName}`}
                  disabled
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="recordedAt">
                  Taken At<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="recordedAt"
                  name="recordedAt"
                  type="datetime-local"
                  required
                  defaultValue={formatFetchedLocalDateTime(new Date())}
                />
                {fieldError("recordedAt") && (
                  <p className="text-sm text-red-600">
                    {fieldError("recordedAt")}
                  </p>
                )}
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

            <div className="grid md:grid-cols-4 gap-10">
              {MEASUREMENTS.slice(0, 4).map((measurement) => (
                <div className="grid gap-3" key={measurement.name}>
                  <Label htmlFor={measurement.name}>{measurement.label}</Label>
                  <Input
                    id={measurement.name}
                    name={measurement.name}
                    type="number"
                    step="any"
                    defaultValue=""
                  />
                  {fieldError(measurement.name) && (
                    <p className="text-sm text-red-600">
                      {fieldError(measurement.name)}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-10">
              {MEASUREMENTS.slice(4, 7).map((measurement) => (
                <div className="grid gap-3" key={measurement.name}>
                  <Label htmlFor={measurement.name}>{measurement.label}</Label>
                  <Input
                    id={measurement.name}
                    name={measurement.name}
                    type="number"
                    step="any"
                    defaultValue=""
                  />
                  {fieldError(measurement.name) && (
                    <p className="text-sm text-red-600">
                      {fieldError(measurement.name)}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-10">
              {MEASUREMENTS.slice(7).map((measurement) => (
                <div className="grid gap-3" key={measurement.name}>
                  <Label htmlFor={measurement.name}>{measurement.label}</Label>
                  <Input
                    id={measurement.name}
                    name={measurement.name}
                    type="number"
                    step="any"
                    defaultValue=""
                  />
                  {fieldError(measurement.name) && (
                    <p className="text-sm text-red-600">
                      {fieldError(measurement.name)}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {result && !result.ok && (
              <p className="text-red-600">{result.error.message}</p>
            )}

            <Button type="submit" className="mt-4 mr-2" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Vitals"}
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

export default AddVitalsPage;
