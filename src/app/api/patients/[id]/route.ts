import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const id = (await params).id;

    const patient = await prisma.patient.findUnique({
      where: {
        id: id,
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json(patient);
  } catch (error) {
    console.error("Error fetching patient: ", error);
    return NextResponse.json(
      { error: "Failed to fetch patient" },
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

    const existingPatient = await prisma.patient.findUnique({
      where: { id: id },
    });

    if (!existingPatient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const updatedPatient = await prisma.patient.update({
      where: { id: id },
      data: {
        ...body,
        dateOfBirth: new Date(body.dateOfBirth),
        referredDate: body.referredDate ? new Date(body.referredDate) : null,
      },
    });

    return NextResponse.json(updatedPatient);
  } catch (error) {
    console.error("Error updating patient:", error);
    return NextResponse.json(
      { error: "Failed to update patient" },
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

    const existingPatient = await prisma.patient.findUnique({
      where: { id: id },
    });

    if (!existingPatient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Delete patient (this will cascade delete related admissions and appointments)
    await prisma.patient.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Patient deleted" });
  } catch (error) {
    console.error("Error deleting patient:", error);
    return NextResponse.json(
      { error: "Failed to delete patient" },
      { status: 500 }
    );
  }
};

export { GET, PUT, DELETE };
