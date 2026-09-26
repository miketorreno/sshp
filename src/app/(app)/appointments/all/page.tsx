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
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/utils";
import { useTransition } from "react";
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

const AllAppointmentsPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: appointments, isPending, isError } = useAppointmentList();
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
            <Input placeholder="Search appointments..." className="pl-8" />
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
                      No appointments found
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
                      <TableCell>
                        {appointment.provider?.role === "DOCTOR" &&
                          appointment.provider.name}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(appointment.startDateTime)}
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
                                  `/appointments/${appointment.id}/edit`
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AllAppointmentsPage;
