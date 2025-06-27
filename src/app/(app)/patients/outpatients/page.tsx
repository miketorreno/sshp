"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, UserCheck2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateAge, formatTime } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

const OutpatientsPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [outpatients, setOutpatients] = useState<PatientVisit[]>([]);

  const fetchOutpatients = async () => {
    try {
      const response = await fetch("/api/patients/outpatients");
      if (!response.ok) {
        throw new Error("Failed to fetch outpatients");
      }

      const data = await response.json();
      setOutpatients(data);
    } catch (error) {
      console.error("Error: ", error);
      toast.error("Failed to load outpatients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutpatients();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Today&apos;s Outpatients</h1>
        <Link href="/visits/checkin">
          <Button>
            <UserCheck2 />
            Patient Check-in
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading outpatients...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Visit Type</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Last Visit</TableHead>
                  <TableHead>Next Appointment</TableHead>
                  <TableHead>Examiner</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outpatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12">
                      No outpatients found
                    </TableCell>
                  </TableRow>
                ) : (
                  outpatients.map((outpatient) => (
                    <TableRow key={outpatient.id}>
                      <TableCell>
                        {outpatient.patient.firstName}{" "}
                        {outpatient.patient.middleName}{" "}
                        {outpatient.patient.lastName}
                      </TableCell>
                      <TableCell>
                        {calculateAge(outpatient.patient.dateOfBirth)}
                      </TableCell>
                      <TableCell>{outpatient.patient.gender}</TableCell>
                      <TableCell>{outpatient.visitType}</TableCell>
                      <TableCell>
                        {formatTime(outpatient.startDateTime)}
                      </TableCell>
                      <TableCell></TableCell>
                      {/* <TableCell>{getLastVisitDate(patient)}</TableCell> */}
                      <TableCell></TableCell>
                      {/* <TableCell>{getNextAppointmentDate(patient)}</TableCell> */}
                      <TableCell>
                        {outpatient?.provider &&
                          outpatient?.provider.role === "DOCTOR" && (
                            <h4 className="text-xl font-semibold">
                              {outpatient.provider.firstName}{" "}
                              {outpatient.provider.lastName}
                            </h4>
                          )}
                      </TableCell>
                      <TableCell>Orders</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/visits/${outpatient.id}`)
                              }
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/patients/${outpatient.patient.id}/appointments/new`
                                )
                              }
                            >
                              Schedule Appointment
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/patients/${outpatient.patient.id}/history`
                                )
                              }
                            >
                              Medical History
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/patients/${outpatient.patient.id}/prescriptions/new`
                                )
                              }
                            >
                              Prescribe Medication
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OutpatientsPage;
