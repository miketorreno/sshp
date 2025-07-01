import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const AppointmentCalendar = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);

  const fetchAppointments = async () => {
    try {
      const response = await fetch("/api/appointments");
      if (!response.ok) {
        throw new Error("Failed to fetch appointments");
      }

      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error("Error: ", error);
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const calendarEvents = appointments.map((appointment) => ({
    id: appointment.id,
    title: `${appointment.patient?.firstName} ${appointment.patient?.middleName}`,
    start: appointment.startDateTime,
    end: appointment.endDateTime,
    // extendedProps: {
    //   type: appointment.type,
    //   doctor: appointment.doctor,
    //   status: appointment.status,
    //   patientId: appointment.patientId
    // },
    // backgroundColor: getEventColor(appointment.type),
    // borderColor: getEventColor(appointment.type)
  }));

  const handleEventClick = (info: { event: { id: string } }) => {
    router.push(`/appointments/${info.event.id}`);
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  return (
    <div>
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <p>Loading calendar...</p>
        </div>
      ) : (
        <FullCalendar
          plugins={[interactionPlugin, timeGridPlugin, dayGridPlugin]}
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
      )}
    </div>
  );
};

export default AppointmentCalendar;
