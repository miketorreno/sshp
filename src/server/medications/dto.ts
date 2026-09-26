/**
 * The medication read model the medication picker consumes. It is the identity
 * and naming of a catalogue entry, and nothing else: a medication is named here
 * and the order that uses it is written in a visit.
 */

export type MedicationSummaryDto = {
  id: string;
  name: string;
  brandName: string | null;
};

export function toMedicationSummary(medication: {
  id: string;
  name: string;
  brandName: string | null;
}): MedicationSummaryDto {
  return {
    id: medication.id,
    name: medication.name,
    brandName: medication.brandName,
  };
}
