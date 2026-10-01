import { getPrisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/server/access";
import { toMedicationSummary, type MedicationSummaryDto } from "./dto";

/**
 * The medication catalogue read. It requires a session that holds
 * `medications:read`, and it returns only medications the pharmacy still holds: an
 * archived medication is not something a request can name.
 */

export async function listMedications(): Promise<MedicationSummaryDto[]> {
  await requirePermission(PERMISSIONS.MEDICATIONS_READ);

  const medications = await getPrisma().medication.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, brandName: true },
  });

  return medications.map(toMedicationSummary);
}
