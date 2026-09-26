import { NextResponse, type NextRequest } from "next/server";
import { jsonFailure, toFailureResponse } from "@/lib/http";
import { APPOINTMENT_NOT_FOUND } from "@/server/appointments/contract";
import { getAppointmentDetail } from "@/server/appointments/reads";

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const appointment = await getAppointmentDetail(id);

    if (!appointment) return jsonFailure(APPOINTMENT_NOT_FOUND);

    return NextResponse.json(appointment);
  } catch (error) {
    return toFailureResponse(error);
  }
};
