"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type SearchPatientResponse = {
  patients?: Patient[];
  error?: string;
};

export async function getPatient(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: {
      id: patientId,
    },
  });

  if (!patient) {
    return { error: "Patient not found" };
  }

  return patient;
}

export async function deletePatient(patientId: string) {
  const existingPatient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!existingPatient) {
    return { error: "Patient not found" };
  }

  await prisma.patient.delete({
    where: {
      id: patientId,
    },
  });

  revalidatePath("/patients/all");
  redirect("/patients/all");
}

/**
 * @param query The search string provided by the patient.
 * @returns A promise that resolves to a SearchPatientResponse object.
 */
export async function searchPatients(
  query: string
): Promise<SearchPatientResponse> {
  if (!query) {
    return { patients: [] };
  }

  try {
    const patients = await prisma.patient.findMany({
      where: {
        email: {
          contains: query,
          mode: "insensitive",
        },
      },
      take: 10,
    });

    return { patients };
  } catch (err) {
    console.error("Database search failed:", err);
    return { error: "Failed to search for patients. Please try again." };
  }
}
