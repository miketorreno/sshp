import { NextResponse } from "next/server";
import { toFailureResponse } from "@/lib/http";
import { listAdmittedPatients } from "@/server/patients/reads";

export const GET = async () => {
  try {
    return NextResponse.json(await listAdmittedPatients());
  } catch (error) {
    return toFailureResponse(error);
  }
};
