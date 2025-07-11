import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const POST = async (request: NextRequest) => {
  // TODO: zod validation here...

  try {
    const body = await request.json();
    const medicationOrder = await prisma.medicationOrder.create({
      data: {
        dosage: body.dosage,
        frequency: body.frequency,
        route: body.route,
        notes: body.prescription,
        visit: {
          connect: {
            id: body.visit.id.toString(),
          },
        },
      },
    });

    return NextResponse.json(medicationOrder, { status: 201 });
  } catch (err) {
    console.error("Error creating medication request:", err);
    return NextResponse.json(
      {
        error: "Failed to create medication request",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
};

export { POST };
