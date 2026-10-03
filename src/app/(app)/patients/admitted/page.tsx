"use client";
import { useClinicTimeZone } from "@/components/clinic-time-zone-provider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateAge } from "@/lib/clinic-time";
import { useAdmittedPatients } from "@/client/patients/queries";
import { usePermissions } from "@/components/permissions-provider";
import { PERMISSIONS } from "@/server/permissions";

const AdmittedPatientsPage = () => {
  // The clinic's zone, read from the server-rendered tree: a client component
  // cannot read `process.env`, so it is handed down. See ADR 0004.
  const zone = useClinicTimeZone();

  // Booking an appointment is the appointment desk's write, and this list is
  // offered to a role that can read patients.
  const { can } = usePermissions();

  const router = useRouter();

  const { isPending, isError, data: patients } = useAdmittedPatients();

  if (isPending) {
    return (
      <div className="flex justify-center items-center h-40">
        <p>Loading admitted patients...</p>
      </div>
    );
  }

  if (isError || !patients) {
    return (
      <div className="flex justify-center items-center h-40">
        <p className="text-red-600">Error loading admitted patients</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Admitted Patients</h1>
      </div>

      <Card>
        <CardContent>
          {patients.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <p>No admitted patients found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      {patient.firstName} {patient.middleName}{" "}
                      {patient.lastName}
                    </TableCell>
                    <TableCell>{calculateAge(patient.dateOfBirth, zone)}</TableCell>
                    <TableCell>{patient.gender}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/patients/${patient.id}`)}
                          >
                            View
                          </DropdownMenuItem>
                          {can(PERMISSIONS.APPOINTMENTS_WRITE) && (
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/appointments/add?patient=${patient.id}`,
                                )
                              }
                            >
                              Schedule Appointment
                            </DropdownMenuItem>
                          )}
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

export default AdmittedPatientsPage;
