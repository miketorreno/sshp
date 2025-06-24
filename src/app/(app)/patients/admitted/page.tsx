"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MoreHorizontal } from "lucide-react";
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
import { useState } from "react";
import { useRouter } from "next/navigation";
import { calculateAge } from "@/lib/utils";

interface Admission {
  id: string;
  roomNumber: string;
  admissionDate: string;
  diagnosis: string | null;
  status: string;
  patient: {
    id: string;
    name: string;
    dateOfBirth: string;
    gender: string;
  };
}

const AdmittedPatientsPage = () => {
  const router = useRouter();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAdmissions, setFilteredAdmissions] = useState<Admission[]>([]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Admitted Patients</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search admitted patients..."
              className="pl-8"
              value={searchTerm}
            />
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
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Admission Date</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      No admitted patients found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAdmissions.map((admission) => (
                    <TableRow key={admission.id}>
                      <TableCell>{admission.patient.name}</TableCell>
                      <TableCell>
                        {calculateAge(new Date(admission.patient.dateOfBirth))}
                      </TableCell>
                      <TableCell>{admission.patient.gender}</TableCell>
                      <TableCell>{admission.roomNumber}</TableCell>
                      <TableCell>
                        {formatDate(admission.admissionDate)}
                      </TableCell>
                      <TableCell>{admission.diagnosis || "-"}</TableCell>
                      <TableCell>Stable</TableCell>
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
                                router.push(`/patients/${admission.patient.id}`)
                              }
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/patients/${admission.patient.id}/update-status`
                                )
                              }
                            >
                              Update Status
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/patients/${admission.patient.id}/history`
                                )
                              }
                            >
                              Medical History
                            </DropdownMenuItem>
                            <DropdownMenuItem>Discharge</DropdownMenuItem>
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
