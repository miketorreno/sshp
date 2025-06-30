"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateAge, formatDate } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const PatientPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient>();

  const fetchPatient = async () => {
    const { id } = await params;

    try {
      const response = await fetch(`/api/patients/${id}`);

      if (response.status === 404) {
        throw new Error("Patient not found");
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch patient");
      }

      const data = await response.json();
      setPatient(data);
    } catch (err) {
      console.error("Error: ", err);
      toast.error("Failed to load patient");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatient();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Patient Profile</h1>
      </div>

      <Card className="mb-8">
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading patient...</p>
            </div>
          ) : (
            <div className="space-y-12">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Image
                    src="https://placehold.co/100x100/png"
                    width={100}
                    height={100}
                    alt="profile"
                    className="rounded-full"
                  />
                  <h3 className="text-2xl font-semibold tracking-tight mt-8 mb-4">
                    {patient?.firstName} {patient?.middleName}{" "}
                    {patient?.lastName}
                  </h3>
                  <Link href={`/patients/${patient?.id}/edit`}>
                    <Button type="button" size={"sm"}>
                      Edit Patient
                    </Button>
                  </Link>
                </div>

                <div className="col-span-2">
                  <div className="grid grid-cols-2 md:grid-cols-3">
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Gender
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {patient?.gender}
                      </p>
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Age
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {calculateAge(patient?.dateOfBirth)}
                      </p>
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Blood
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {patient?.bloodGroup}
                      </p>
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Status
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {patient?.patientStatus}
                      </p>
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Phone
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {patient?.phone}
                      </p>
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Email
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {patient?.email}
                      </p>
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Appointment
                      </p>
                      <p className="font-semibold text-sm leading-6"></p>
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Registered
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {formatDate(patient?.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold my-2">Patient Current Vitals</h2>
      <div className="grid md:grid-cols-4 gap-8 mb-8">
        <Card className="">
          <CardHeader>
            <CardDescription>Blood Pressure</CardDescription>
            <CardTitle className="text-xl font-semibold">
              120/80
              <span className="text-muted-foreground text-sm ml-2">mm/hg</span>
            </CardTitle>
          </CardHeader>
          <CardFooter className="items-start text-sm">
            <div className="text-green-600 font-semibold">In the norm</div>
          </CardFooter>
        </Card>

        <Card className="">
          <CardHeader>
            <CardDescription>Heart Rate</CardDescription>
            <CardTitle className="text-xl font-semibold">
              100
              <span className="text-muted-foreground text-sm ml-2">BPM</span>
            </CardTitle>
          </CardHeader>
          <CardFooter className="items-start text-sm">
            <div className="text-red-600 font-semibold">Above the norm</div>
          </CardFooter>
        </Card>

        <Card className="">
          <CardHeader>
            <CardDescription>Glucose</CardDescription>
            <CardTitle className="text-xl font-semibold">
              88
              <span className="text-muted-foreground text-sm ml-2">mg/dl</span>
            </CardTitle>
          </CardHeader>
          <CardFooter className="items-start text-sm">
            <div className="text-green-600 font-semibold">In the norm</div>
          </CardFooter>
        </Card>

        <Card className="">
          <CardHeader>
            <CardDescription>Cholesterol</CardDescription>
            <CardTitle className="text-xl font-semibold">
              75
              <span className="text-muted-foreground text-sm ml-2">mg/dl</span>
            </CardTitle>
          </CardHeader>
          <CardFooter className="items-start text-sm">
            <div className="text-green-600 font-semibold">In the norm</div>
          </CardFooter>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Patient History</h1>
        <p className="">Total X Visits</p>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading visits...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date of Visit</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Visits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* {visits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No visits found
                    </TableCell>
                  </TableRow>
                ) : (
                  // TODO - visits here...
                  visits.map((visits) => (
                    <TableRow key={visits.id}>
                      <TableCell>
                        {visits.firstName} {visits.middleName} {visits.lastName}
                      </TableCell>
                      <TableCell>{visits.dateOfBirth}</TableCell>
                      <TableCell>{visits.gender}</TableCell>
                      <TableCell>{visits.bloodGroup}</TableCell>
                      <TableCell>{visits.patientType}</TableCell>
                      <TableCell className="capitalize">
                        {visits.patientStatus}
                      </TableCell>
                      <TableCell>{visits.phone || "-"}</TableCell>
                    </TableRow>
                  ))
                )} */}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientPage;
