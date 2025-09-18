"use server";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const id = (await params).id;

    const appointment = await prisma.appointment.findUnique({
      where: {
        id: id,
      },
      include: {
        patient: true,
        provider: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Error fetching appointment: ", error);
    return NextResponse.json(
      { error: "Failed to fetch appointment" },
      { status: 500 }
    );
  }
};

const PUT = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  // TODO: zod validation here...

  try {
    const id = (await params).id;
    const body = await request.json();

    const existingAppointment = await prisma.appointment.findUnique({
      where: {
        id: id,
      },
    });

    if (!existingAppointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const appointment = await prisma.appointment.update({
      where: {
        id: id,
      },
      data: {
        startDateTime: new Date(body.startDateTime),
        endDateTime: new Date(body.endDateTime),
        appointmentType: body.appointmentType,
        appointmentStatus: body.appointmentStatus,
        reason: body.reason,
      },
    });

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
};

const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const id = (await params).id;

    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: id },
    });

    if (!existingAppointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    await prisma.appointment.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Appointment deleted" });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json(
      { error: "Failed to delete appointment" },
      { status: 500 }
    );
  }
};

export { GET, PUT, DELETE };
