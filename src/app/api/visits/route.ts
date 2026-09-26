import { NextResponse, type NextRequest } from "next/server";
import { toFailureResponse, toIntegerParam } from "@/lib/http";
import type { VisitType } from "@/generated/prisma";
import { VISIT_TYPES, type VisitListQuery } from "@/server/visits/contract";
import { listVisits } from "@/server/visits/reads";

export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  try {
    return NextResponse.json(await listVisits(toListQuery(searchParams)));
  } catch (error) {
    return toFailureResponse(error);
  }
};

function toListQuery(params: URLSearchParams): VisitListQuery {
  const visitType = params.get("visitType");

  return {
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    ...(isVisitType(visitType) ? { visitType } : {}),
    limit: toIntegerParam(params, "limit"),
  };
}

/** A type the schema does not name is no filter, not a broken read. */
function isVisitType(value: string | null): value is VisitType {
  return VISIT_TYPES.some((type) => type === value);
}
