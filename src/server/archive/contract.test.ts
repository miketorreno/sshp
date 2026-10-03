import { describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma";
import { PERMISSIONS, permissionsOf } from "@/server/access";
import {
  ARCHIVE_SECTIONS,
  archiveApiPaths,
  restoreBlockedCopy,
  type ArchiveSectionKey,
} from "@/server/archive/contract";

const sessionOf = (role: string) => ({ user: { role, isActive: true } });

const sectionsFor = (role: string): ArchiveSectionKey[] => {
  const held = permissionsOf(sessionOf(role));

  return ARCHIVE_SECTIONS.filter((section) =>
    held.includes(section.archivePermission),
  ).map((section) => section.key);
};

describe("the archive's sections", () => {
  it("covers every archiveable domain, each behind its own archive permission", () => {
    // One section per thing the clinic archives. A domain with a restore command
    // and nowhere to find the record is a restore nobody can reach.
    expect(ARCHIVE_SECTIONS.map((section) => section.key)).toEqual([
      "patients",
      "appointments",
      "visits",
      "vitals",
      "orders",
    ]);

    expect(
      ARCHIVE_SECTIONS.map((section) => section.archivePermission),
    ).toEqual([
      PERMISSIONS.PATIENTS_ARCHIVE,
      PERMISSIONS.APPOINTMENTS_ARCHIVE,
      PERMISSIONS.VISITS_ARCHIVE,
      PERMISSIONS.VITALS_ARCHIVE,
      PERMISSIONS.ORDERS_ARCHIVE,
    ]);
  });

  it("names each section's restore beside it", () => {
    // Written out rather than derived from the archive permission, so a domain
    // whose restore is reserved to a different role than its archive can say so.
    expect(
      ARCHIVE_SECTIONS.map((section) => section.restorePermission),
    ).toEqual([
      PERMISSIONS.PATIENTS_RESTORE,
      PERMISSIONS.APPOINTMENTS_RESTORE,
      PERMISSIONS.VISITS_RESTORE,
      PERMISSIONS.VITALS_RESTORE,
      PERMISSIONS.ORDERS_RESTORE,
    ]);
  });

  it("gives each section a read path of its own", () => {
    const paths = ARCHIVE_SECTIONS.map((section) =>
      archiveApiPaths.list(section.key),
    );

    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toEqual([
      "/api/archive/patients?page=1&limit=20",
      "/api/archive/appointments?page=1&limit=20",
      "/api/archive/visits?page=1&limit=20",
      "/api/archive/vitals?page=1&limit=20",
      "/api/archive/orders?page=1&limit=20",
    ]);
  });

  it("shows a role only the domains it may archive", () => {
    expect(sectionsFor(Role.ADMIN)).toEqual(
      ARCHIVE_SECTIONS.map((section) => section.key),
    );
    expect(sectionsFor(Role.NURSE)).toEqual([
      "appointments",
      "visits",
      "vitals",
    ]);
    expect(sectionsFor(Role.PATIENT)).toEqual([]);
  });
});

describe("what a blocked restore says", () => {
  const patient = {
    recordType: "Patient",
    id: "patient-1",
    patientName: "Ada Lovelace",
  } as const;

  it("names the patient to restore first", () => {
    expect(restoreBlockedCopy(patient)).toBe(
      "Restore Ada Lovelace's patient record first.",
    );
  });

  it("names the visit to restore first", () => {
    expect(
      restoreBlockedCopy({
        recordType: "Visit",
        id: "visit-1",
        patientName: "Ada Lovelace",
      }),
    ).toBe("Restore Ada Lovelace's visit first.");
  });

  it("says nothing when nothing is in the way", () => {
    expect(restoreBlockedCopy(null)).toBeNull();
  });
});