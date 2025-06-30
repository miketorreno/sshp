import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const id = (await params).id;

    const visit = await prisma.visit.findUnique({
      where: {
        id: id,
      },
      include: {
        patient: true,
        provider: true,
      },
    });

    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    return NextResponse.json(visit);
  } catch (error) {
    console.error("Error fetching visit: ", error);
    return NextResponse.json(
      { error: "Failed to fetch visit" },
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

    const existingVisit = await prisma.visit.findUnique({
      where: {
        id: id,
      },
    });

    if (!existingVisit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const visit = await prisma.visit.update({
      where: {
        id: id,
      },
      data: {
        startDateTime: new Date(body.startDateTime),
        reason: body.reason,
        visitType: body.visitType,
      },
    });

    return NextResponse.json(visit);
  } catch (error) {
    console.error("Error updating visit:", error);
    return NextResponse.json(
      { error: "Failed to update visit" },
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
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    // Delete patient (this will cascade delete related admissions and appointments)
    await prisma.patient.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Visit deleted" });
  } catch (error) {
    console.error("Error deleting patient:", error);
    return NextResponse.json(
      { error: "Failed to delete patient" },
      { status: 500 }
    );
  }
};

export { GET, PUT, DELETE };
