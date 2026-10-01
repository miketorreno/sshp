"use client";
import { useClinicTimeZone } from "@/components/clinic-time-zone-provider";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deletePatient } from "@/app/actions/patient-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateAge } from "@/lib/clinic-time";
import {
  invalidatePatientWrites,
  usePatientList,
  usePatientSearch,
} from "@/client/patients/queries";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const PATIENT_PAGE_SIZE = 20;

const AllPatientsPage = () => {
  // The clinic's zone, read from the server-rendered tree: a client component
  // cannot read `process.env`, so it is handed down. See ADR 0004.
  const zone = useClinicTimeZone();

  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isArchiving, startArchiving] = useTransition();
  const debouncedSearch = useDebouncedValue(search.trim());

  const list = usePatientList({ page: 1, limit: PATIENT_PAGE_SIZE });
  const matches = usePatientSearch(debouncedSearch);
  const isSearching = debouncedSearch.length > 0;
  const patientsQuery = isSearching ? matches : list;
  const patients = patientsQuery.data ?? [];

  const archivePatient = (patientId: string) => {
    startArchiving(async () => {
      const result = await deletePatient(patientId);

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success("Patient archived");
      await invalidatePatientWrites(queryClient, patientId);
    });
  };

  if (list.isPending) {
    return (
      <div className="flex justify-center items-center h-40">
        <p>Loading patients...</p>
      </div>
    );
  }

  if (patientsQuery.isError) {
    return (
      <div className="flex justify-center items-center h-40">
        <p className="text-red-600">Error loading patients</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">All Patients</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search patients..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent>
          {isSearching && patientsQuery.isFetching ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : patients.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <p>No patients found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Blood</TableHead>
                  <TableHead>Phone</TableHead>
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
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>{calculateAge(patient.dateOfBirth, zone)}</TableCell>
                    <TableCell>{patient.gender}</TableCell>
                    <TableCell>{patient.bloodGroup}</TableCell>
                    <TableCell>{patient.phone || "-"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() =>
                              router.push(`/patients/${patient.id}`)
                            }
                          >
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() =>
                              router.push(`/patients/${patient.id}/edit`)
                            }
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 cursor-pointer"
                            disabled={isArchiving}
                            onClick={() => archivePatient(patient.id)}
                          >
                            Delete
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

export default AllPatientsPage;
