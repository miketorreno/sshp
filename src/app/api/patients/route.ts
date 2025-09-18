"use server";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const GET = async () => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!patients) {
      return NextResponse.json({ msg: "No patients found" });
    }

    return NextResponse.json(patients);
  } catch (error) {
    console.error("Error fetching patients: ", error);
    return NextResponse.json(
      { error: "Failed to fetch patients" },
      { status: 500 }
    );
  }
};

const POST = async (request: NextRequest) => {
  // TODO: zod validation here...

  try {
    const body = await request.json();
    const patient = await prisma.patient.create({
      data: {
        ...body,
        dateOfBirth: new Date(body.dateOfBirth),
        referredDate: body.referredDate ? new Date(body.referredDate) : null,
      },
    });

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error("Error creating patient:", error);
    return NextResponse.json(
      {
        error: "Failed to create patient",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

export { GET, POST };
