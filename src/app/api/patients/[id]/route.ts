import { NextResponse, type NextRequest } from "next/server";
import { jsonFailure, toFailureResponse } from "@/lib/http";
import { PATIENT_NOT_FOUND } from "@/server/patients/contract";
import { getPatientDetail } from "@/server/patients/reads";

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const patient = await getPatientDetail(id);

    if (!patient) return jsonFailure(PATIENT_NOT_FOUND);

    return NextResponse.json(patient);
  } catch (error) {
    return toFailureResponse(error);
  }
};
