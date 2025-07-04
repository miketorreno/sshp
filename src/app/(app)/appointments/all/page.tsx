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
import { useEffect, useState } from "react";
import { toast } from "sonner";

const AllAppointmentsPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [filteredAppointments, setFilteredAppointments] = useState<
    PatientAppointment[]
  >([]);

  const fetchAppointments = async () => {
    try {
      const response = await fetch("/api/appointments");
      if (!response.ok) {
        throw new Error("Failed to fetch appointments");
      }

      const data = await response.json();
      setFilteredAppointments(data);
    } catch (error) {
      console.error("Error: ", error);
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this appointment?")) {
      try {
        const response = await fetch(`/api/appointments/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete appointment");
        }

        setFilteredAppointments((prev) =>
          prev.filter((appointment) => appointment.id !== id)
        );
        toast.success("Appointment deleted");
      } catch (error) {
        console.error("Error deleting appointment:", error);
        toast.error("Failed to delete appointment");
      }
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

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
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading appointments...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Examiner</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      No appointments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        {appointment.patient.firstName}{" "}
                        {appointment.patient.middleName}{" "}
                        {appointment.patient.lastName}
                      </TableCell>
                      <TableCell>{appointment.appointmentType}</TableCell>
                      <TableCell>
                        {appointment?.provider &&
                          appointment?.provider.role === "DOCTOR" && (
                            <h4 className="text-xl font-semibold">
                              {appointment.provider.firstName}{" "}
                              {appointment.provider.lastName}
                            </h4>
                          )}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(appointment.startDateTime)}
                      </TableCell>
                      <TableCell>{appointment.appointmentStatus}</TableCell>
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
                                router.push(`/visits/${appointment.id}`)
                              }
                            >
                              Check In
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
                              onClick={() => handleDelete(appointment.id)}
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
