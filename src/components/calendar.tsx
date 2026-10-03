"use client";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import luxonPlugin from "@fullcalendar/luxon3";
import type { DatesSetArg } from "@fullcalendar/core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppointmentList } from "@/client/appointments/queries";
import { useClinicTimeZone } from "@/components/clinic-time-zone-provider";

/**
 * The calendar is a read surface: it shows the appointments inside the days it
 * is drawing, and clicking an event opens the appointment. It never moves an
 * appointment, so it never writes.
 *
 * It reads a window rather than a page. The calendar knows which days it drew, so
 * it asks for exactly those, and a month is a month rather than the first N
 * appointments in the clinic. Every navigation asks again for the days now drawn.
 *
 * Appointments are timed in the clinic's own zone, which is not the zone of the
 * browser reading them: a clinician in a different zone must still see 09:00 as
 * the clinic's 09:00. FullCalendar only understands `UTC` and `local` on its own,
 * so the Luxon plugin is what lets it draw an arbitrary IANA zone; without it a
 * `CLINIC_TIME_ZONE` of `Asia/Manila` would be silently ignored and every column
 * would shift for whoever is not in UTC.
 */
const AppointmentCalendar = () => {
  const router = useRouter();

  // The clinic's zone, read from the server-rendered tree: a client component
  // cannot read `process.env`, so it is handed down. See ADR 0004.
  const zone = useClinicTimeZone();
  const [drawnDays, setDrawnDays] = useState<DrawnRange>();

  // The first window arrives from the calendar's own dates, so the read waits
  // for it rather than falling back to a page of the list for the seconds before.
  const {
    isPending,
    isError,
    data: appointments,
  } = useAppointmentList(
    { from: drawnDays?.from, to: drawnDays?.to },
    { enabled: drawnDays !== undefined },
  );

  const calendarEvents = (appointments ?? []).map((appointment) => ({
    id: appointment.id,
    title: `${appointment.patient.firstName} ${appointment.patient.middleName} ${appointment.patient.lastName}`,
    start: appointment.startDateTime,
    end: appointment.endDateTime,
  }));

  const handleDatesSet = (range: DatesSetArg) => {
    setDrawnDays({ from: range.start.toISOString(), to: range.end.toISOString() });
  };

  const handleEventClick = (info: { event: { id: string } }) => {
    router.push(`/appointments/${info.event.id}`);
  };

  // A calendar that failed to load is indistinguishable from a month with nothing
  // in it, and an empty month is the one thing a clinician cannot act on. Say
  // which it is.
  if (drawnDays !== undefined && isError) {
    return (
      <p className="flex h-40 items-center justify-center text-red-600">
        Failed to load appointments for these dates
      </p>
    );
  }

  return (
    <>
      {drawnDays !== undefined && isPending && (
        <p className="text-muted-foreground text-sm">Loading appointments...</p>
      )}
      <FullCalendar
        plugins={[luxonPlugin, timeGridPlugin, dayGridPlugin]}
        timeZone={zone}
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
        datesSet={handleDatesSet}
        events={isPending || isError ? [] : calendarEvents}
        eventClick={handleEventClick}
      />
    </>
  );
};

/** The days the calendar drew, as the instants a read's window is named by. */
type DrawnRange = { from: string; to: string };

export default AppointmentCalendar;
