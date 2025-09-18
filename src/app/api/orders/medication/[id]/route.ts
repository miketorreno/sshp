"use server";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const id = (await params).id;

    const existingOrder = await prisma.medicationOrder.findUnique({
      where: { id: id },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await prisma.medicationOrder.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Order deleted" });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
};

export { DELETE };
