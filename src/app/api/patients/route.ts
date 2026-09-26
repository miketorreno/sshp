import { NextResponse, type NextRequest } from "next/server";
import { toFailureResponse, toIntegerParam } from "@/lib/http";
import {
  listPatients,
  searchPatients,
} from "@/server/patients/reads";
import type { PatientListQuery } from "@/server/patients/contract";

export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  try {
    return NextResponse.json(
      query === null
        ? await listPatients(toListQuery(searchParams))
        : await searchPatients(query)
    );
  } catch (error) {
    return toFailureResponse(error);
  }
};

function toListQuery(params: URLSearchParams): PatientListQuery {
  return {
    page: toIntegerParam(params, "page"),
    limit: toIntegerParam(params, "limit"),
  };
}
