"use client";

/**
 * The clinic's zone, for a component that renders in the browser.
 *
 * A client component cannot read `CLINIC_TIME_ZONE`: `process.env` is stripped
 * from the browser bundle unless a variable is `NEXT_PUBLIC_`-prefixed, and
 * prefixing this one would make it a build input — the thing ADR 0003 exists to
 * prevent, and it would bake one clinic's offset into an image another clinic
 * deploys. So the server reads the zone and hands it down; this context is how
 * it arrives.
 *
 * The provider is mounted in the authenticated app layout, which is a server
 * component, so every staff-facing screen is under it. The value is a string
 * rather than anything richer because that is all it is: the name of a zone, and
 * the clock module is the only thing that interprets it.
 */

import { createContext, useContext } from "react";

/**
 * The zone every staff-facing screen renders moments in.
 *
 * `null` until the provider reaches it. A screen outside the provider renders
 * `UTC` rather than throwing, because a wrong hour is visible and a blank page
 * is not — and the fallback matches the container's own zone, so an unconfigured
 * deployment is consistent rather than broken.
 */
const ClinicTimeZoneContext = createContext<string | null>(null);

export const ClinicTimeZoneProvider = ({
  zone,
  children,
}: {
  zone: string;
  children: React.ReactNode;
}) => (
  <ClinicTimeZoneContext.Provider value={zone}>
    {children}
  </ClinicTimeZoneContext.Provider>
);

/**
 * The clinic's zone, as a plain argument to pass to `src/lib/clinic-time`.
 *
 * Named to say where it comes from, so a call site reads as the thing it is: a
 * screen that was told the clinic's zone by the server, not one that went looking
 * for it.
 */
export function useClinicTimeZone(): string {
  return useContext(ClinicTimeZoneContext) ?? "UTC";
}