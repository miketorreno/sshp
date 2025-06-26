"use server";
import prisma from "@/lib/prisma";

export type SearchPatientResponse = {
  patients?: Patient[];
  error?: string;
};

/**
 * @param query The search string provided by the patient.
 * @returns A promise that resolves to a SearchPatientResponse object.
 */
export async function searchPatients(
  query: string
): Promise<SearchPatientResponse> {
  // TODO: In production remove this
  await new Promise((resolve) => setTimeout(resolve, 500));

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

    // Avoid sending raw database error details to the client for security reasons.
    return { error: "Failed to search for patients. Please try again." };
  }
}
