"use server";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const GET = async () => {
  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        patient: true,
      },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments: ", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
};

const POST = async (request: NextRequest) => {
  // TODO: zod validation here...

  try {
    const body = await request.json();
    const appointment = await prisma.appointment.create({
      data: {
        startDateTime: new Date(body.startDateTime),
        endDateTime: new Date(body.endDateTime),
        appointmentType: body.appointmentType,
        appointmentStatus: body.appointmentStatus,
        reason: body.reason,
        patient: {
          connect: {
            id: body.patient,
          },
        },
      },
    });

    return NextResponse.json(appointment, { status: 201 });
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
