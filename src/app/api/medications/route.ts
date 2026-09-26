import { NextResponse } from "next/server";
import { toFailureResponse } from "@/lib/http";
import { listMedications } from "@/server/medications/reads";

export const GET = async () => {
  try {
    return NextResponse.json(await listMedications());
  } catch (error) {
    return toFailureResponse(error);
  }
};
