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
import { useRouter } from "next/navigation";
import { calculateAge, formatTime } from "@/lib/utils";
import Link from "next/link";
import { useVisitList } from "@/client/visits/queries";
import { localDay, startOfToday } from "@/lib/clinic-day";

/**
 * Today's Outpatients is the clinic day's list read: it asks the canonical visit
 * list for today's window rather than a second endpoint of its own, so a visit
 * that shows here is a visit the rest of the clinic can read.
 */
const OutpatientsPage = () => {
  const router = useRouter();
  const today = localDay(startOfToday());
  const {
    data: visits,
    isPending,
    isError,
  } = useVisitList({
    from: today,
    to: today,
  });

  if (isPending) {
    return (
      <div className="flex justify-center items-center h-40">
        <p>Loading outpatients...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-40">
        <p className="text-red-600">Error loading outpatients</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Today&apos;s Outpatients</h1>
        <Link href="/visits/checkin">
          <Button type="button">
            <UserCheck2 />
            Patient Check-in
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent>
          {visits?.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <p>No outpatients today</p>
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
                {visits?.map((outpatient) => (
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
                      {outpatient.provider ? (
                        <h4 className="text-xl font-semibold">
                          {outpatient.provider.name}
                        </h4>
                      ) : null}
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
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/visits/${outpatient.id}/edit`)
                            }
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/patients/${outpatient.patient.id}/appointments/new`,
                              )
                            }
                          >
                            Schedule Appointment
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/patients/${outpatient.patient.id}/history`,
                              )
                            }
                          >
                            Medical History
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/patients/${outpatient.patient.id}/prescriptions/new`,
                              )
                            }
                          >
                            Prescribe Medication
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OutpatientsPage;
