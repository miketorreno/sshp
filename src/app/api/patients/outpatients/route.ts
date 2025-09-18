"use server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const GET = async () => {
  try {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    const outpatientsToday = await prisma.visit.findMany({
      where: {
        startDateTime: {
          gt: startOfDay,
          lt: endOfDay,
        },
      },
      include: {
        patient: true,
      },
    });

    if (!outpatientsToday) {
      return NextResponse.json({ msg: "No outpatients found" });
    }

    return NextResponse.json(outpatientsToday);
  } catch (err) {
    console.error("Error fetching outpatients: ", err);
    return NextResponse.json(
      { err: "Failed to fetch outpatients" },
      { status: 500 }
    );
  }
};

export { GET };
