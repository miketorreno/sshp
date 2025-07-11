import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const POST = async (request: NextRequest) => {
  // TODO: zod validation here...

  try {
    const body = await request.json();
    const labOrder = await prisma.labOrder.create({
      data: {
        labType: body.labType,
        notes: body.notes,
        visit: {
          connect: {
            id: body.visit.id.toString(),
          },
        },
      },
    });

    return NextResponse.json(labOrder, { status: 201 });
  } catch (err) {
    console.error("Error creating lab request:", err);
    return NextResponse.json(
      {
        error: "Failed to create lab request",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
};

export { POST };
