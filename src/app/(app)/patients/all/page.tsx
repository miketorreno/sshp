"use client";
import { useClinicTimeZone } from "@/components/clinic-time-zone-provider";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreHorizontal, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { archivePatient } from "@/app/actions/patient-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import Pagination from "@/components/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateAge } from "@/lib/clinic-time";
import { usePermissions } from "@/components/permissions-provider";
import { PERMISSIONS } from "@/server/permissions";
import {
  invalidatePatientWrites,
  usePatientList,
} from "@/client/patients/queries";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { lastPageOf } from "@/lib/paging";
import {
  PATIENT_LIST_PAGE_SIZE,
  PATIENT_SEARCH_DEBOUNCE_MS,
} from "@/server/patients/contract";

/**
 * How many patients a page of the list holds. A screen of twenty rows: the point
 * of the total count is that the reader can see there are more and go to them,
 * which a page long enough to hold the whole clinic would not need.
 */
const PATIENT_PAGE_SIZE = PATIENT_LIST_PAGE_SIZE;

const AllPatientsPage = () => {
  // The clinic's zone, read from the server-rendered tree: a client component
  // cannot read `process.env`, so it is handed down. See ADR 0004.
  const zone = useClinicTimeZone();

  // What this clinician may do with a patient, answered from the matrix the
  // layout handed down. A menu item is here because the command behind it exists
  // for this role, not because it was written for everyone.
  const { can } = usePermissions();

  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  // What the box holds, and what is actually searched for, are two values: the
  // second follows the first after a pause. Typing "Lovelace" is eight keystrokes
  // and therefore eight reads, of which the first seven are a prefix nobody asked
  // for. The read that the debounce supersedes is cancelled, so the results on
  // screen are the newest term's and never a slower earlier one arriving late.
  const [term, setTerm] = useState("");
  const settled = useDebouncedValue(term.trim(), PATIENT_SEARCH_DEBOUNCE_MS);
  const {
    data: patients,
    isPending,
    isError,
    isFetching,
    error,
  } = usePatientList({ page, limit: PATIENT_PAGE_SIZE, search: settled });

  const rows = patients?.rows ?? [];
  const totalCount = patients?.totalCount ?? 0;
  const lastPage = lastPageOf(totalCount, PATIENT_PAGE_SIZE);

  // A new search is a new list: staying on page 3 of the old results would show a
  // reader the third page of an answer to a question they are no longer asking.
  const searchFor = (next: string) => {
    setTerm(next);
    setPage(1);
  };

  // Archiving the last patient of the last page leaves the reader on a page that
  // no longer exists, with nothing to tell them so. Stepping back to the page
  // that does exist is the same answer the read gives, arrived at without an
  // empty page on screen — adjusted while rendering rather than in an effect, so
  // the reader never sees the page that stopped existing at all.
  if (!isPending && !isError && page > lastPage) setPage(lastPage);

  const [isArchiving, startArchiving] = useTransition();

  const archive = (patientId: string) => {
    startArchiving(async () => {
      const result = await archivePatient(patientId);

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success("Patient archived");
      await invalidatePatientWrites(queryClient, patientId);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">All Patients</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search patients by name, email, or patient code"
              placeholder="Search patients..."
              className="pl-8"
              value={term}
              onChange={(event) => searchFor(event.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Announced rather than drawn: the rows change under a reader who is
          typing, and the count and the failure are the two things they cannot
          see for themselves. */}
      <p className="sr-only" role="status" aria-live="polite">
        {statusAnnouncement({
          isPending,
          isError,
          isFetching,
          settled,
          rowCount: rows.length,
          totalCount,
        })}
      </p>

      <Card>
        <CardContent>
          {isPending ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading patients...</p>
            </div>
          ) : isError ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-red-600">
                {error instanceof Error
                  ? error.message
                  : "Failed to load patients"}
              </p>
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
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      {/* Two different questions, two different answers. "No
                          patients found" when the clinic has none says the panel
                          is empty; "no patients match" after a search says the
                          panel is full and the term was wrong, which is a much
                          more useful thing to read. */}
                      {settled
                        ? `No patients match "${settled}". Archived patients are not searched.`
                        : "No patients found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((patient) => (
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
                            {can(PERMISSIONS.PATIENTS_WRITE) && (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() =>
                                  router.push(`/patients/${patient.id}/edit`)
                                }
                              >
                                Edit
                              </DropdownMenuItem>
                            )}
                            {can(PERMISSIONS.PATIENTS_ARCHIVE) && (
                              <DropdownMenuItem
                                className="text-red-600 cursor-pointer"
                                disabled={isArchiving}
                                onClick={() => archive(patient.id)}
                              >
                                Archive
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* A spinner beside the rows rather than in place of them: the rows on
              screen are still the ones the reader was looking at, and blanking
              them for a keystroke's duration is a flash with no information in
              it. */}
          {isFetching && !isPending && (
            <div className="flex justify-center items-center pt-4">
              <Loader2
                className="h-5 w-5 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          )}

          {/* Paging is hidden while a read is in flight, so the controls never
              describe rows that have already been replaced. */}
          {!isPending && !isError && (
            <Pagination
              page={page}
              rowCount={rows.length}
              pageSize={PATIENT_PAGE_SIZE}
              totalCount={totalCount}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * What a screen reader is told about the list.
 *
 * Said once per settled change rather than on every keystroke: announcing each
 * intermediate read would narrate the reader's own typing back at them.
 */
function statusAnnouncement({
  isPending,
  isError,
  isFetching,
  settled,
  rowCount,
  totalCount,
}: {
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  settled: string;
  rowCount: number;
  totalCount: number;
}): string {
  if (isPending) return "Loading patients";
  if (isError) return "Patients could not be loaded";
  if (isFetching) return "";

  if (rowCount === 0) {
    return settled
      ? `No patients match ${settled}`
      : "No patients to show";
  }

  const label = totalCount === 1 ? "patient" : "patients";

  return settled
    ? `${totalCount} ${label} match ${settled}`
    : `${totalCount} ${label}`;
}

export default AllPatientsPage;
