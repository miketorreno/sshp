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
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateAge } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const AdmittedPatientsPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [admittedPatients, setAdmittedPatients] = useState<PatientVisit[]>([]);

  const fetchAdmittedPatients = async () => {
    try {
      const response = await fetch("/api/patients/admitted");
      if (!response.ok) {
        throw new Error("Failed to fetch admitted patients");
      }

      const data = await response.json();
      setAdmittedPatients(data);
    } catch (err) {
      console.error("Error: ", err);
      toast.error("Failed to load admitted patients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmittedPatients();
  }, []);

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
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading admitted patients...</p>
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
                {admittedPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12">
                      No admitted patients found
                    </TableCell>
                  </TableRow>
                ) : (
                  admittedPatients.map((admittedPatient) => (
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

export default AdmittedPatientsPage;
