"use server";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const POST = async (request: NextRequest) => {
  // TODO: zod validation here...

  try {
    const body = await request.json();
    const vitals = await prisma.vitals.create({
      data: {
        height: body.height ? parseInt(body.height) : null,
        weight: body.weight ? parseInt(body.weight) : null,
        systolicBP: body.systolicBP ? parseInt(body.systolicBP) : null,
        diastolicBP: body.diastolicBP ? parseInt(body.diastolicBP) : null,
        heartRate: body.heartRate ? parseInt(body.heartRate) : null,
        temperatureCelsius: body.temperatureCelsius
          ? parseFloat(body.temperatureCelsius)
          : null,
        respiratoryRate: body.respiratoryRate
          ? parseInt(body.respiratoryRate)
          : null,
        oxygenSaturation: body.oxygenSaturation
          ? parseFloat(body.oxygenSaturation)
          : null,
        glucose: body.glucose ? parseInt(body.glucose) : null,
        cholesterol: body.cholesterol ? parseInt(body.cholesterol) : null,
        visit: {
          connect: {
            id: body.visit.id.toString(),
          },
        },
      },
    });

    return NextResponse.json(vitals, { status: 201 });
  } catch (err) {
    console.error("Error while adding vitals:", err);
    return NextResponse.json(
      {
        error: "Error while adding vitals",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
};

export { POST };
