"use client";
import { useClinicTimeZone } from "@/components/clinic-time-zone-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatClinicDateTime, toDateTimeLocalValue } from "@/lib/clinic-time";
import { useRouter } from "next/navigation";
import { use, useActionState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { addVitals } from "@/app/actions/vitals-actions";
import { invalidateVisitWrites, useVisitDetail } from "@/client/visits/queries";
import { visitPage } from "@/server/visits/contract";
import {
  VITALS_MEASUREMENTS,
  type VitalsMeasurement,
} from "@/server/visits/vitals-measurements";

type VitalsActionState = Awaited<ReturnType<typeof addVitals>> | null;

/**
 * One measurement's input: its label, its column, and the precision that column
 * holds. A clinician is offered the decimals the database can store rather than
 * typing a reading it would have to round, and the label carries the unit the
 * visit's table will later print.
 */
const MeasurementInput = ({
  measurement,
  error,
}: {
  measurement: VitalsMeasurement;
  error?: string;
}) => (
  <div className="grid gap-3">
    <Label htmlFor={measurement.field}>{measurement.label}</Label>
    <Input
      id={measurement.field}
      name={measurement.field}
      type="number"
      step={measurement.wholeNumbersOnly ? "1" : "any"}
      defaultValue=""
    />
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>
);

/**
 * A row of measurements, split only so a form is readable: the catalogue is one
 * list, and the grouping is layout rather than meaning.
 */
const MeasurementRow = ({
  measurements,
  columns,
  errorFor,
}: {
  measurements: readonly VitalsMeasurement[];
  columns: string;
  errorFor: (field: string) => string | undefined;
}) => (
  <div className={`grid gap-10 ${columns}`}>
    {measurements.map((measurement) => (
      <MeasurementInput
        key={measurement.field}
        measurement={measurement}
        error={errorFor(measurement.field)}
      />
    ))}
  </div>
);

/**
 * Recording vitals is a measurement taken during one visit, so the visit is
 * named by the page rather than chosen here. A box left blank records no reading;
 * a box holding a zero records a zero.
 */
const AddVitalsPage = ({ params }: { params: Promise<{ id: string }> }) => {
  // The clinic's zone, read from the server-rendered tree: a client component
  // cannot read `process.env`, so it is handed down. See ADR 0004.
  const zone = useClinicTimeZone();

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
      : undefined;

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
                  defaultValue={toDateTimeLocalValue(new Date(), zone)}
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
                  value={`${formatClinicDateTime(visit.startDateTime, zone)} - ${visit.visitType}`}
                  disabled
                />
              </div>
            </div>

            <MeasurementRow
              measurements={VITALS_MEASUREMENTS.slice(0, 4)}
              columns="md:grid-cols-4"
              errorFor={fieldError}
            />

            <MeasurementRow
              measurements={VITALS_MEASUREMENTS.slice(4, 7)}
              columns="md:grid-cols-3"
              errorFor={fieldError}
            />

            <MeasurementRow
              measurements={VITALS_MEASUREMENTS.slice(7)}
              columns="md:grid-cols-3"
              errorFor={fieldError}
            />

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
