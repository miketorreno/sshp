import { NextResponse, type NextRequest } from "next/server";
import { jsonFailure, toFailureResponse } from "@/lib/http";
import { VISIT_NOT_FOUND } from "@/server/visits/contract";
import { getVisitDetail } from "@/server/visits/reads";

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const visit = await getVisitDetail(id);

    if (!visit) return jsonFailure(VISIT_NOT_FOUND);

    return NextResponse.json(visit);
  } catch (error) {
    return toFailureResponse(error);
  }
};
