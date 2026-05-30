"use server";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import z from "zod";

const VisitSchema = z.object({
  startDateTime: z.string().min(1),
  visitType: z.enum([
    "CLINIC",
    "EMERGENCY",
    "FOLLOWUP",
    "IMAGING",
    "LAB",
    "PHARMACY",
  ]),
  reason: z.string().min(1),
  patient: z.string().min(1),
});

export async function createVisit(formData: FormData): Promise<void> {
  const raw = {
    startDateTime: formData.get("startDateTime") as string,
    visitType: formData.get("visitType") as string,
    reason: formData.get("reason") as string,
    patient: formData.get("patient") as string,
  };

  const parsed = VisitSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }

  const visit = await prisma.visit.create({
    data: {
      startDateTime: new Date(parsed.data.startDateTime),
      visitType: parsed.data.visitType,
      reason: parsed.data.reason,
      patient: {
        connect: {
          id: parsed.data.patient,
        },
      },
    },
  });

  redirect(`/visits/${visit.id}`);
}
