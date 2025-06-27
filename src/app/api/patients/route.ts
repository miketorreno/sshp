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
        firstName: body.firstName,
        middleName: body.middleName,
        lastName: body.lastName,
        dateOfBirth: new Date(body.dateOfBirth),
        gender: body.gender,
        bloodGroup: body.bloodGroup || null,
        placeOfBirth: body.placeOfBirth || null,
        occupation: body.occupation || null,
        phone: body.phone,
        email: body.email,
        address: body.address || null,
        country: body.country || null,
        patientStatus: body.patientStatus || null,
        guardian: body.guardian || null,
        referredBy: body.referredBy || null,
        referredDate: new Date(body.referredDate) || null,
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
