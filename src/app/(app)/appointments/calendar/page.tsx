"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import AppointmentCalendar from "@/components/calendar";

const AllAppointmentsPage = () => {
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
          <AppointmentCalendar />
        </CardContent>
      </Card>
    </div>
  );
};

export default AllAppointmentsPage;
