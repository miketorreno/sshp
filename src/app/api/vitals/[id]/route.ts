"use server";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const id = (await params).id;

    const existingVitals = await prisma.vitals.findUnique({
      where: { id: id },
    });

    if (!existingVitals) {
      return NextResponse.json({ error: "Vitals not found" }, { status: 404 });
    }

    await prisma.vitals.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Vitals deleted" });
  } catch (err) {
    console.error("Error while deleting vitals:", err);
    return NextResponse.json(
      { error: "Error while deleting vitals" },
      { status: 500 }
    );
  }
};

export { DELETE };
