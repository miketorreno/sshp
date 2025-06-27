import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const GET = async () => {
  try {
    const admittedPatients = await prisma.patient.findMany({
      where: {
        patientType: "INPATIENT",
      },
    });

    if (!admittedPatients) {
      return NextResponse.json({ msg: "No admitted patients" });
    }

    return NextResponse.json(admittedPatients);
  } catch (err) {
    console.error("Error fetching admitted patients: ", err);
    return NextResponse.json(
      { err: "Failed to fetch admitted patients" },
      { status: 500 }
    );
  }
};

export { GET };
