/**
 * The medications the pharmacy's catalogue starts from. Tests override only the
 * rows their case is about, so a test reads as the one situation it describes.
 */

export type CatalogueEntry = {
  id: string;
  name: string;
  brandName: string | null;
  description: string | null;
  stockQuantity: number;
  deletedAt: Date | null;
};

export const amoxicillin: CatalogueEntry = {
  id: "medication-1",
  name: "Amoxicillin",
  brandName: "Amoxil",
  description: "Penicillin antibiotic",
  stockQuantity: 40,
  deletedAt: null,
};

export const insulin: CatalogueEntry = {
  ...amoxicillin,
  id: "medication-2",
  name: "Insulin",
  brandName: null,
};

/** An archived medication, kept for history but off the catalogue. */
export const archived: CatalogueEntry = {
  ...amoxicillin,
  id: "medication-3",
  name: "Aspirin",
  deletedAt: new Date("2026-02-01T00:00:00.000Z"),
};

export const CATALOGUE: CatalogueEntry[] = [amoxicillin, insulin];

export const SESSION = {
  session: { id: "session-1", userId: "user-1" },
  user: {
    id: "user-1",
    email: "doctor@clinic.test",
    role: "DOCTOR",
    isActive: true,
  },
};
