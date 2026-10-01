"use client";
import { useClinicTimeZone } from "@/components/clinic-time-zone-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatClinicDateTime } from "@/lib/clinic-time";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useTransition } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { checkInAppointment } from "@/app/actions/appointment-actions";
import { useAppointmentDetail } from "@/client/appointments/queries";

const AppointmentPage = ({ params }: { params: Promise<{ id: string }> }) => {
  // The clinic's zone, read from the server-rendered tree: a client component
  // cannot read `process.env`, so it is handed down. See ADR 0004.
  const zone = useClinicTimeZone();

  const router = useRouter();
  const { id } = use(params);
  const { isPending, isError, data: appointment } = useAppointmentDetail(id);
  const [isCheckingIn, startCheckingIn] = useTransition();

  // A successful check-in navigates to the visit it opened, so only the failure
  // comes back here.
  const checkIn = () => {
    startCheckingIn(async () => {
      const result = await checkInAppointment(id);

      if (!result.ok) toast.error(result.error.message);
    });
  };

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold my-2">Appointment Info</h1>
        <Card className="mb-8">
          <CardContent>
            <div className="flex justify-center items-center h-40">
              <p>Loading appointment...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !appointment) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold my-2">Appointment Info</h1>
        <Card className="mb-8">
          <CardContent>
            <div className="flex justify-center items-center h-40">
              <p className="text-red-600">Appointment not found</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Appointment Info</h1>
      </div>

      <Card className="mb-8">
        <CardContent>
          <div className="space-y-8">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Image
                  src="https://placehold.co/100x100/png"
                  width={100}
                  height={100}
                  alt="profile"
                  className="rounded-full"
                />
                <div className="my-4">
                  <Link href={`/patients/${appointment.patient.id}`}>
                    <h4 className="text-xl font-semibold">
                      {appointment.patient.firstName}{" "}
                      {appointment.patient.middleName}{" "}
                      {appointment.patient.lastName}
                    </h4>
                  </Link>
                </div>
              </div>

              <div className="col-span-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="my-3">
                    <span className="text-muted-foreground">Provider</span>
                    {/* Any provider is the provider of this appointment. Gating
                        this on the doctor role made a nurse's or a technician's
                        appointment read as though it had nobody; deciding who may
                        see which provider is #30's question, not this one's. */}
                    <h4 className="text-xl font-semibold">
                      {appointment.provider?.name ?? "Unassigned"}
                    </h4>
                  </div>
                  <div className="my-3">
                    <p className="text-muted-foreground text-sm leading-6">
                      Start Date
                    </p>
                    <p className="font-semibold text-sm leading-6">
                      {formatClinicDateTime(appointment.startDateTime, zone)}
                    </p>
                  </div>
                  <div className="my-3">
                    <p className="text-muted-foreground text-sm leading-6">
                      End Date
                    </p>
                    <p className="font-semibold text-sm leading-6">
                      {formatClinicDateTime(appointment.endDateTime, zone)}
                    </p>
                  </div>
                  <div className="my-3">
                    <p className="text-muted-foreground text-sm leading-6">
                      Type
                    </p>
                    <p className="font-semibold text-sm leading-6">
                      {appointment.appointmentType}
                    </p>
                  </div>
                  <div className="my-3">
                    <p className="text-muted-foreground text-sm leading-6">
                      Status
                    </p>
                    <p className="font-semibold text-sm leading-6">
                      {appointment.appointmentStatus}
                    </p>
                  </div>
                  <div className="my-3">
                    <p className="text-muted-foreground text-sm leading-6">
                      Notes
                    </p>
                    <p className="font-semibold text-sm leading-6">
                      {appointment.reason}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-20 flex flex-row-reverse gap-2">
            <Button type="button" onClick={() => router.back()} size={"sm"}>
              Back
            </Button>
            <Link href={`/appointments/${appointment.id}/edit`}>
              <Button type="button" size={"sm"}>
                Edit Appointment
              </Button>
            </Link>
            {appointment.checkedIn ? (
              <Button type="button" size={"sm"} disabled>
                Already checked in
              </Button>
            ) : (
              <Button
                type="button"
                size={"sm"}
                onClick={checkIn}
                disabled={isCheckingIn}
              >
                {isCheckingIn ? "Checking in..." : "Check In"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentPage;
