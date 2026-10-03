/**
 * The clinic's navigation, and the part of it a role may use.
 *
 * A destination is offered to a role that holds the permission its read or write
 * needs, so a clinician is not led to a screen whose read the boundary refuses.
 * The permission is named beside the destination rather than derived from the URL,
 * because the URL says where a screen lives and the matrix says who may read it —
 * a route prefix is not a capability, and inferring one would let a new page
 * inherit a capability nobody granted.
 *
 * The destinations with no permission beside them have no screen yet, so there is
 * no read to ask for one. When those screens arrive they are annotated with the
 * permission their read asks for, in the same way as every other destination here.
 */

import {
  Archive,
  CalendarDays,
  Fullscreen,
  Microscope,
  Pill,
  Store,
  User,
  type LucideIcon,
} from "lucide-react";
import { ARCHIVE_PERMISSIONS } from "@/server/archive/contract";
import { PERMISSIONS, type Permission } from "@/server/permissions";

/**
 * A place the navigation leads to, and what a role must hold to be led there.
 *
 * `permission` is the whole question for most destinations. `anyOf` is for the
 * ones several capabilities feed — the archive holds a list per domain, so any
 * domain's archive permission is enough to reach it.
 */
type Destination = {
  title: string;
  url: string;
  permission?: Permission;
  anyOf?: readonly Permission[];
};

type Group = {
  title: string;
  icon: LucideIcon;
  isActive?: boolean;
  items: readonly Destination[];
};

/** A group as `NavMain` draws it: destinations, with no permission beside them. */
export type NavigationItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: NavigationItem[];
};

const NAVIGATION: readonly Group[] = [
  {
    title: "Patients",
    icon: User,
    isActive: true,
    items: [
      {
        title: "Add Patient",
        url: "/patients/add",
        permission: PERMISSIONS.PATIENTS_WRITE,
      },
      {
        title: "All Patients",
        url: "/patients/all",
        permission: PERMISSIONS.PATIENTS_READ,
      },
      {
        title: "Outpatients",
        url: "/patients/outpatients",
        permission: PERMISSIONS.VISITS_READ,
      },
      {
        title: "Admitted",
        url: "/patients/admitted",
        permission: PERMISSIONS.PATIENTS_READ,
      },
      {
        title: "Report",
        url: "/patients/reports",
        permission: PERMISSIONS.REPORTS_READ,
      },
    ],
  },
  {
    title: "Appointments",
    icon: CalendarDays,
    isActive: true,
    items: [
      {
        title: "Add Appointment",
        url: "/appointments/add",
        permission: PERMISSIONS.APPOINTMENTS_WRITE,
      },
      {
        title: "All Appointments",
        url: "/appointments/all",
        permission: PERMISSIONS.APPOINTMENTS_READ,
      },
      {
        title: "Appointments Calendar",
        url: "/appointments/calendar",
        permission: PERMISSIONS.APPOINTMENTS_READ,
      },
      {
        title: "Report",
        url: "/appointments/reports",
      },
    ],
  },
  {
    // Reachable by a role that may archive something: the screen shows that role
    // the domains it may archive and nothing else, so the destination does not
    // have to know which of them that is.
    title: "Archive",
    icon: Archive,
    isActive: true,
    items: [
      { title: "Archived Records", url: "/archive", anyOf: ARCHIVE_PERMISSIONS },
    ],
  },
  {
    title: "Laboratory",
    icon: Microscope,
    isActive: true,
    items: [
      { title: "Requests", url: "/lab/requests" },
      { title: "Completed", url: "/lab/completed" },
    ],
  },
  {
    title: "Medication",
    icon: Pill,
    isActive: true,
    items: [
      { title: "Requests", url: "/medication/requests" },
      { title: "Completed", url: "/medication/completed" },
    ],
  },
  {
    title: "Imaging",
    icon: Fullscreen,
    isActive: true,
    items: [
      { title: "Requests", url: "/imaging/requests" },
      { title: "Completed", url: "/imaging/completed" },
    ],
  },
  {
    title: "Inventory",
    icon: Store,
    isActive: true,
    items: [
      { title: "Add Item", url: "/inventory/items/add" },
      { title: "All Items", url: "/inventory/items" },
      { title: "Add Request", url: "/inventory/requests/add" },
      { title: "All Requests", url: "/inventory/requests" },
      { title: "Received", url: "/inventory/received" },
      { title: "Report", url: "/inventory/reports" },
    ],
  },
];

/**
 * The navigation for one role: every destination it may use, under the group the
 * destination belongs to.
 *
 * A group with nothing left under it is dropped, because a header that opens onto
 * nothing is a destination the role cannot use wearing a group's clothes.
 */
export function navigationFor(
  can: (permission: Permission) => boolean,
): NavigationItem[] {
  const groups: NavigationItem[] = [];

  for (const group of NAVIGATION) {
    const items = group.items.filter((item) => mayUse(item, can));
    if (items.length === 0) continue;

    groups.push({
      title: group.title,
      url: `#${group.title}`,
      icon: group.icon,
      isActive: group.isActive,
      items,
    });
  }

  return groups;
}

/**
 * Every destination in the navigation, flattened. For a caller that wants the
 * paths rather than the tree — a test, or a screen checking what it may link to.
 */
export function destinations(groups: readonly NavigationItem[]): string[] {
  return groups.flatMap((group) =>
    (group.items ?? []).map((item) => item.url),
  );
}

/** Every destination title in the navigation, flattened, for the same reason. */
export function titlesUnder(groups: readonly NavigationItem[]): string[] {
  return groups.flatMap((group) =>
    (group.items ?? []).map((item) => item.title),
  );
}

function mayUse(
  destination: Destination,
  can: (permission: Permission) => boolean,
): boolean {
  if (destination.permission) return can(destination.permission);
  if (destination.anyOf) return destination.anyOf.some(can);

  return true;
}