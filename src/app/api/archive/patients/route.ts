import { NextResponse, type NextRequest } from "next/server";
import { archiveListQuery } from "@/app/api/archive/list-query";
import { toFailureResponse } from "@/lib/http";
import { listArchivedPatients } from "@/server/patients/reads";

export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  try {
    return NextResponse.json(
      await listArchivedPatients(archiveListQuery(searchParams)),
    );
  } catch (error) {
    return toFailureResponse(error);
  }
};
