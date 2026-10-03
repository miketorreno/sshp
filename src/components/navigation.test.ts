import { describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma";
import { PERMISSIONS, permissionsOf } from "@/server/access";
import { destinations, navigationFor, titlesUnder } from "@/components/navigation";

const sessionOf = (role: string) => ({ user: { role, isActive: true } });

/** The navigation a role is offered, as the paths it leads to. */
const pathsFor = (role: string): string[] => {
  const held = permissionsOf(sessionOf(role));

  return destinations(navigationFor((asked) => held.includes(asked)));
};

/** The navigation a clinician holding exactly one permission is offered. */
const pathsHolding = (permission: string): string[] =>
  destinations(
    navigationFor((asked) => asked === permission),
  );

describe("the navigation a role is offered", () => {
  it("offers an administrative role every destination", () => {
    // Nothing is held back from a role that holds every permission, so a missing
    // destination cannot be mistaken for one a role may not use.
    const every = pathsFor(Role.ADMIN);

    expect(new Set(every).size).toBe(every.length);
    expect(every).toEqual(expect.arrayContaining([
      "/patients/add",
      "/appointments/calendar",
      "/archive",
    ]));
  });

  it("keeps the archive from a role that may archive nothing", () => {
    expect(pathsFor(Role.PATIENT)).not.toContain("/archive");
  });

  it("keeps a destination whose permission the role does not hold", () => {
    // A fresh account can look a patient up and see who is expected today, and
    // changes nothing: it is offered those two reads and none of the writes.
    expect(pathsFor(Role.USER)).toEqual(
      expect.arrayContaining(["/patients/all", "/appointments/all"]),
    );
    expect(pathsFor(Role.USER)).not.toEqual(
      expect.arrayContaining([
        "/patients/add",
        "/patients/outpatients",
        "/patients/reports",
        "/appointments/add",
        "/archive",
      ]),
    );
  });

  it("keeps the calendar and the report from a role that may not read them", () => {
    // A pharmacist reads the clinical record's patients and visits and the
    // pharmacy's catalogue, and nothing about the appointment desk.
    const paths = pathsFor(Role.PHARMACIST);

    expect(paths).not.toContain("/appointments/all");
    expect(paths).not.toContain("/appointments/calendar");
    expect(paths).not.toContain("/patients/reports");
    expect(pathsFor(Role.NURSE)).toEqual(
      expect.arrayContaining([
        "/appointments/calendar",
        "/patients/reports",
      ]),
    );
  });

  it("offers the outpatients list only to a role that reads visits", () => {
    // Outpatients is a read of visits rather than of patients, so it follows the
    // visit read and not the registration one.
    expect(pathsFor(Role.NURSE)).toContain("/patients/outpatients");
    expect(pathsFor(Role.USER)).not.toContain("/patients/outpatients");
  });

  it("offers the archive to a role that may archive one domain", () => {
    for (const permission of [
      PERMISSIONS.PATIENTS_ARCHIVE,
      PERMISSIONS.APPOINTMENTS_ARCHIVE,
      PERMISSIONS.VISITS_ARCHIVE,
      PERMISSIONS.VITALS_ARCHIVE,
      PERMISSIONS.ORDERS_ARCHIVE,
    ]) {
      expect(pathsHolding(permission)).toContain("/archive");
    }
  });

  it("drops a group whose every destination is held back", () => {
    // A header with nothing under it is a destination the role cannot use, so it
    // goes with the destinations it was hiding.
    const groups = navigationFor(() => false);

    expect(titlesUnder(groups)).not.toContain("Patients");
    expect(titlesUnder(groups)).not.toContain("Appointments");
  });
});