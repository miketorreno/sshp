import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const POST = async (request: NextRequest) => {
  // TODO: zod validation here...

  try {
    const body = await request.json();
    const imagingOrder = await prisma.imagingOrder.create({
      data: {
        imagingType: body.imagingType,
        notes: body.notes,
        visit: {
          connect: {
            id: body.visit.id.toString(),
          },
        },
      },
    });

    return NextResponse.json(imagingOrder, { status: 201 });
  } catch (error) {
    console.error("Error creating imaging request:", error);
    return NextResponse.json(
      {
        error: "Failed to create imaging request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

export { POST };
