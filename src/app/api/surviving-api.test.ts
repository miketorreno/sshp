import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const { handler } = vi.hoisted(() => ({ handler: vi.fn() }));

// This suite reads the shape of the API, not what it serves, so the routes get
// an inert database behind them and no request is ever made.
vi.mock("@/lib/auth", () => ({
  getAuth: () => ({ handler, api: { getSession: vi.fn() } }),
}));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => {} }));

import * as appointmentRoute from "@/app/api/appointments/route";
import * as appointmentDetailRoute from "@/app/api/appointments/[id]/route";
import * as authRoute from "@/app/api/auth/[...all]/route";
import * as medicationRoute from "@/app/api/medications/route";
import * as patientRoute from "@/app/api/patients/route";
import * as patientAdmittedRoute from "@/app/api/patients/admitted/route";
import * as patientDetailRoute from "@/app/api/patients/[id]/route";
import * as visitRoute from "@/app/api/visits/route";
import * as visitDetailRoute from "@/app/api/visits/[id]/route";

/**
 * The migration finished here: writes are commands and reads are routes, so the
 * whole surviving browser-facing API is this list plus Better Auth's catch-all.
 * These tests watch the shape of that API as a whole, which no per-domain test
 * can see: a route file nobody reads, or a write method someone re-added, would
 * pass every domain test and still leave two authorities for one mutation.
 */

const API_ROOT = join(process.cwd(), "src/app/api");

const BETTER_AUTH_CATCH_ALL = "auth/[...all]/route.ts";

/** Every surviving domain read, as the path the browser calls it by. */
const DOMAIN_READS: Record<string, Record<string, unknown>> = {
  "appointments/route.ts": appointmentRoute,
  "appointments/[id]/route.ts": appointmentDetailRoute,
  "medications/route.ts": medicationRoute,
  "patients/route.ts": patientRoute,
  "patients/[id]/route.ts": patientDetailRoute,
  "patients/admitted/route.ts": patientAdmittedRoute,
  "visits/route.ts": visitRoute,
  "visits/[id]/route.ts": visitDetailRoute,
};

describe("surviving domain API", () => {
  it("is exactly the agreed reads, with no obsolete write route left behind", async () => {
    const found = await routeFiles();

    expect(found).toEqual(
      [...Object.keys(DOMAIN_READS), BETTER_AUTH_CATCH_ALL].sort()
    );
  });

  it.each(Object.keys(DOMAIN_READS))(
    "serves %s as a read, with no write method of its own",
    (route) => {
      expect(Object.keys(DOMAIN_READS[route] ?? {})).toEqual(["GET"]);
    }
  );

  it("leaves Better Auth the only REST exception, handling every method itself", async () => {
    expect(Object.keys(authRoute).sort()).toEqual(["GET", "POST"]);

    const request = new Request("http://localhost/api/auth/sign-out", {
      method: "POST",
    });

    await authRoute.POST(request);
    await authRoute.GET(request);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith(request);
  });
});

async function routeFiles(directory = API_ROOT, prefix = ""): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });

  const found = await Promise.all(
    entries.map(async (entry) => {
      const relative = `${prefix}${entry.name}`;

      if (entry.isDirectory()) {
        return routeFiles(join(directory, entry.name), `${relative}/`);
      }

      return entry.name === "route.ts" ? [relative] : [];
    })
  );

  return found.flat().sort();
}
