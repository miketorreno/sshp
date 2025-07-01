"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";

const AppointmentPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [patientAppointment, setPatientAppointment] =
    useState<PatientAppointment>();

  const fetchAppointment = async () => {
    const { id } = await params;

    try {
      const response = await fetch(`/api/appointments/${id}`);

      if (response.status === 404) {
        throw new Error("Appointment not found");
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch appointment");
      }

      const data = await response.json();
      setPatientAppointment(data);
    } catch (error) {
      console.error("Error: ", error);
      toast.error("Failed to load appointment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Appointment Info</h1>
      </div>

      <Card className="mb-8">
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading appointment...</p>
            </div>
          ) : (
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
                    {/* <span className="text-muted-foreground">Name</span> */}
                    <Link href={`/patients/${patientAppointment?.patient.id}`}>
                      <h4 className="text-xl font-semibold">
                        {patientAppointment?.patient.firstName}{" "}
                        {patientAppointment?.patient.middleName}{" "}
                        {patientAppointment?.patient.lastName}
                      </h4>
                    </Link>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="my-3">
                      <span className="text-muted-foreground">Examiner</span>
                      {patientAppointment?.provider &&
                        patientAppointment?.provider.role === "DOCTOR" && (
                          <h4 className="text-xl font-semibold">
                            {patientAppointment.provider.firstName}{" "}
                            {patientAppointment.provider.lastName}
                          </h4>
                        )}
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Start Date
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {formatDateTime(patientAppointment?.startDateTime)}
                      </p>
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        End Date
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {formatDateTime(patientAppointment?.endDateTime)}
                      </p>
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Type
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {patientAppointment?.appointmentType}
                      </p>
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Status
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {patientAppointment?.appointmentStatus}
                      </p>
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Notes
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {patientAppointment?.reason}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-20 flex flex-row-reverse gap-2">
            <Button type="button" onClick={() => router.back()} size={"sm"}>
              Back
            </Button>
            <Link href={`/appointments/${patientAppointment?.id}/edit`}>
              <Button type="button" size={"sm"}>
                Edit Appointment
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentPage;
