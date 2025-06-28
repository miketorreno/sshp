import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const GET = async () => {
  try {
    const patients = await prisma.visit.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        patient: true,
      },
    });

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
    const visit = await prisma.visit.create({
      data: {
        ...body,
        startDateTime: new Date(body.startDateTime),
        patient: {
          connect: {
            id: body.patient,
          },
        },
      },
    });

    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    console.error("Error creating outpatient:", error);
    return NextResponse.json(
      {
        error: "Failed to create outpatient",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

export { GET, POST };
