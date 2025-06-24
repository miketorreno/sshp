import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const GET = async ({ params }: { params: { id: string } }) => {
  console.log("params: ", params);

  if (!params) {
    return NextResponse.json(
      { error: "id parameter is required" },
      { status: 400 }
    );
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: {
        id: params.id,
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

export { GET };
