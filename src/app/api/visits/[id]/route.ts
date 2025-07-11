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
        imagingOrders: true,
        labOrders: true,
        medOrders: true,
        vitals: true,
        clinicalNotes: true,
        diagnoses: true,
        procedures: true,
      },
    });

    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    return NextResponse.json(visit);
  } catch (err) {
    console.error("Error while fetching visit: ", err);
    return NextResponse.json(
      { error: "Error while fetching visit" },
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
  } catch (err) {
    console.error("Error while updating visit:", err);
    return NextResponse.json(
      { error: "Error while updating visit" },
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

    const existingVisit = await prisma.visit.findUnique({
      where: { id: id },
    });

    if (!existingVisit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    await prisma.visit.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Visit deleted" });
  } catch (err) {
    console.error("Error while deleting visit:", err);
    return NextResponse.json(
      { error: "Error while deleting visit" },
      { status: 500 }
    );
  }
};

export { GET, PUT, DELETE };
