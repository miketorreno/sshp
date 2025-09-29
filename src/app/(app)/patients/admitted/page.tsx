"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Search } from "lucide-react";
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
import { calculateAge } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";

async function fetchAdmittedPatients(): Promise<PatientVisit[]> {
  const response = await fetch("/api/patients/admitted").then((res) =>
    res.json()
  );
  return response;
}

const AdmittedPatientsPage = () => {
  const router = useRouter();

  const { isPending, error, data } = useQuery({
    queryKey: ["admittedPatients"],
    queryFn: fetchAdmittedPatients,
  });

  if (isPending) {
    return (
      <div className="flex justify-center items-center h-40">
        <p>Loading admitted patients...</p>
      </div>
    );
  }

  if (error) {
    toast.error("Failed to load admitted patients");

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
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search admitted patients..." className="pl-8" />
          </div>
        </div>
      </div>

      <Card>
        <CardContent>
          {data.length === 0 ? (
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
                  <TableHead>Room</TableHead>
                  <TableHead>Admission Date</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((admittedPatient) => (
                  <TableRow key={admittedPatient.id}>
                    <TableCell>
                      {admittedPatient.patient.firstName}{" "}
                      {admittedPatient.patient.middleName}{" "}
                      {admittedPatient.patient.lastName}
                    </TableCell>
                    <TableCell>
                      {calculateAge(admittedPatient.patient.dateOfBirth)}
                    </TableCell>
                    <TableCell>{admittedPatient.patient.gender}</TableCell>
                    <TableCell></TableCell>
                    {/* <TableCell>{admittedPatient.roomNumber}</TableCell> */}
                    <TableCell></TableCell>
                    {/* <TableCell>{admittedPatient.admissionDate}</TableCell> */}
                    <TableCell></TableCell>
                    {/* <TableCell>{admittedPatient.diagnosis}</TableCell> */}
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
                              router.push(`/visits/${admittedPatient.id}`)
                            }
                          >
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/patients/${admittedPatient.patient.id}/appointments/new`
                              )
                            }
                          >
                            Schedule Appointment
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/patients/${admittedPatient.patient.id}/history`
                              )
                            }
                          >
                            Medical History
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/patients/${admittedPatient.patient.id}/prescriptions/new`
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

export default AdmittedPatientsPage;
