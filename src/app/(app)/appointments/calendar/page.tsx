"use client";
import { Card, CardContent } from "@/components/ui/card";
import AppointmentCalendar from "@/components/calendar";

/**
 * The calendar screen. It reads the days it draws, so the search that sat here
 * belonged to a list the calendar is not: a box that looked for appointments and
 * never asked about any has been removed rather than left to look like it works.
 * Searching appointments is the table's job, in the table.
 */
const AppointmentsCalendarPage = () => {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold my-2">Appointment Calendar</h1>

      <Card>
        <CardContent>
          <AppointmentCalendar />
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentsCalendarPage;
