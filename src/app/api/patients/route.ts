import { NextResponse, type NextRequest } from "next/server";
import { toFailureResponse, toIntegerParam } from "@/lib/http";
import { listPatients } from "@/server/patients/reads";
import type { PatientListQuery } from "@/server/patients/contract";

export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  try {
    return NextResponse.json(await listPatients(toListQuery(searchParams)));
  } catch (error) {
    return toFailureResponse(error);
  }
};

function toListQuery(params: URLSearchParams): PatientListQuery {
  return {
    page: toIntegerParam(params, "page"),
    limit: toIntegerParam(params, "limit"),
    search: params.get("search") ?? undefined,
  };
}
