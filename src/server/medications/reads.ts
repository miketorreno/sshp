import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { toMedicationSummary, type MedicationSummaryDto } from "./dto";

/**
 * The medication catalogue read. It requires a session, and it returns only
 * medications the pharmacy still holds: an archived medication is not something a
 * request can name.
 */

export async function listMedications(): Promise<MedicationSummaryDto[]> {
  await requireSession();

  const medications = await prisma.medication.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, brandName: true },
  });

  return medications.map(toMedicationSummary);
}
