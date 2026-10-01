"use client";
import { useClinicTimeZone } from "@/components/clinic-time-zone-provider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
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
import { useRouter } from "next/navigation";
import { formatClinicDateTime } from "@/lib/clinic-time";
import { DEFAULT_LIST_LIMIT } from "@/server/appointments/contract";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  checkInAppointment,
  deleteAppointment,
} from "@/app/actions/appointment-actions";
import {
  invalidateAppointmentWrites,
  useAppointmentList,
} from "@/client/appointments/queries";
import Pagination from "@/components/pagination";

const AllAppointmentsPage = () => {
  // The clinic's zone, read from the server-rendered tree: a client component
  // cannot read `process.env`, so it is handed down. See ADR 0004.
  const zone = useClinicTimeZone();

  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  // What the box holds, and what is actually searched for, are two values: the
  // second follows the first after a pause. Typing "Quincy" is five keystrokes and
  // therefore five reads, of which the first four are a prefix nobody asked for.
  const [term, setTerm] = useState("");
  const settled = useDebouncedValue(term.trim());
  const {
    data: appointments,
    isPending,
    isError,
  } = useAppointmentList({
    page,
    limit: DEFAULT_LIST_LIMIT,
    search: settled,
  });

  // A new search is a new list: staying on page 3 of the old results would show a
  // reader the third page of an answer to a question they are no longer asking.
  const searchFor = (next: string) => {
    setTerm(next);
    setPage(1);
  };

  const [isWriting, startWriting] = useTransition();

  const archive = (appointmentId: string) => {
    if (!confirm("Are you sure you want to delete this appointment?")) return;

    startWriting(async () => {
      const result = await deleteAppointment(appointmentId);

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      await invalidateAppointmentWrites(queryClient, appointmentId);
      toast.success("Appointment archived");
    });
  };

  // A successful check-in navigates to the visit it opened, so only the failure
  // comes back here.
  const checkIn = (appointmentId: string) => {
    startWriting(async () => {
      const result = await checkInAppointment(appointmentId);

      if (!result.ok) toast.error(result.error.message);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">All Appointments</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search appointments by patient name or code"
              placeholder="Search appointments..."
              className="pl-8"
              value={term}
              onChange={(event) => searchFor(event.target.value)}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent>
          {isPending ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading appointments...</p>
            </div>
          ) : isError ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-red-600">Failed to load appointments</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      {settled
                        ? `No appointments match "${settled}"`
                        : "No appointments found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments?.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        {appointment.patient.firstName}{" "}
                        {appointment.patient.middleName}{" "}
                        {appointment.patient.lastName}
                      </TableCell>
                      <TableCell>{appointment.appointmentType}</TableCell>
                      <TableCell>{appointment.provider?.name}</TableCell>
                      <TableCell>
                        {formatClinicDateTime(appointment.startDateTime, zone)}
                      </TableCell>
                      <TableCell>{appointment.appointmentStatus}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              disabled={isWriting}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={appointment.checkedIn}
                              onClick={() => checkIn(appointment.id)}
                            >
                              {appointment.checkedIn
                                ? "Already checked in"
                                : "Check In"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/appointments/${appointment.id}`)
                              }
                            >
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/appointments/${appointment.id}/edit`,
                                )
                              }
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => archive(appointment.id)}
                            >
                              Delete
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

          {/* Paging is hidden while a read is in flight, so the controls never
              describe rows that have already been replaced. */}
          {!isPending && !isError && (
            <Pagination
              page={page}
              rowCount={appointments?.length ?? 0}
              pageSize={DEFAULT_LIST_LIMIT}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AllAppointmentsPage;
