"use server";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const PUT = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  // TODO: zod validation here...

  try {
    const id = (await params).id;

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
        endDateTime: new Date(),
      },
    });

    return NextResponse.json(visit);
  } catch (error) {
    console.error("Error checking out patient:", error);
    return NextResponse.json(
      { error: "Failed to checkout patient" },
      { status: 500 }
    );
  }
};

export { PUT };
