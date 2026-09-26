"use client";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useRouter } from "next/navigation";
import { useAppointmentList } from "@/client/appointments/queries";
import { CALENDAR_LIST_LIMIT } from "@/server/appointments/contract";

/**
 * The calendar is a read surface: it shows the same appointment list the table
 * does, and clicking an event opens the appointment. It never moves an
 * appointment, so it never writes.
 */
const AppointmentCalendar = () => {
  const router = useRouter();
  const { isPending, isError, data: appointments } = useAppointmentList({
    limit: CALENDAR_LIST_LIMIT,
  });

  const calendarEvents = (appointments ?? []).map((appointment) => ({
    id: appointment.id,
    title: `${appointment.patient.firstName} ${appointment.patient.middleName}`,
    start: appointment.startDateTime,
    end: appointment.endDateTime,
  }));

  const handleEventClick = (info: { event: { id: string } }) => {
    router.push(`/appointments/${info.event.id}`);
  };

  if (isPending) {
    return (
      <div className="flex justify-center items-center h-40">
        <p>Loading calendar...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-40">
        <p className="text-red-600">Failed to load appointments</p>
      </div>
    );
  }

  return (
    <FullCalendar
      plugins={[timeGridPlugin, dayGridPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{
        left: "dayGridMonth,timeGridWeek,timeGridDay",
        center: "title",
        right: "today prev,next",
      }}
      height="auto"
      eventTimeFormat={{
        hour: "2-digit",
        minute: "2-digit",
        meridiem: "short",
      }}
      events={calendarEvents}
      eventClick={handleEventClick}
    />
  );
};

export default AppointmentCalendar;
