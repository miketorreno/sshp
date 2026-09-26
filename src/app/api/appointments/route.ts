import { NextResponse, type NextRequest } from "next/server";
import { toFailureResponse, toIntegerParam } from "@/lib/http";
import type { AppointmentListQuery } from "@/server/appointments/contract";
import { listAppointments } from "@/server/appointments/reads";

export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  try {
    return NextResponse.json(
      await listAppointments(toListQuery(searchParams))
    );
  } catch (error) {
    return toFailureResponse(error);
  }
};

function toListQuery(params: URLSearchParams): AppointmentListQuery {
  return {
    page: toIntegerParam(params, "page"),
    limit: toIntegerParam(params, "limit"),
  };
}
