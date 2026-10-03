import { NextResponse, type NextRequest } from "next/server";
import { toFailureResponse } from "@/lib/http";
import {
  PATIENT_REPORT_PERIODS,
  type PatientReportPeriod,
} from "@/server/patients/contract";
import { getPatientReport } from "@/server/patients/report";

export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  try {
    return NextResponse.json(
      await getPatientReport(toReportPeriod(searchParams)),
    );
  } catch (error) {
    return toFailureResponse(error);
  }
};

/**
 * The period the caller named, or a month if they named none.
 *
 * A period is a length, not a number the report can be missing: falling back to
 * a month answers "how are we doing" with something readable, whereas rejecting
 * the read leaves the reader with an error and no figures at all.
 */
function toReportPeriod(params: URLSearchParams): PatientReportPeriod {
  const period = params.get("period");

  return isPatientReportPeriod(period) ? period : "month";
}

function isPatientReportPeriod(value: string | null): value is PatientReportPeriod {
  return PATIENT_REPORT_PERIODS.some((period) => period === value);
}