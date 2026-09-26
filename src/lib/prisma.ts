import { PrismaClient } from "../generated/prisma";
import { withAccelerate } from "@prisma/extension-accelerate";
import { requireRuntimeEnv } from "@/lib/runtime-env";

/**
 * The database seam every domain read and the auth system share.
 *
 * The client is built on first use rather than at import, because `next build`
 * imports this module to collect page data and a client built there would ask the
 * builder for a database it does not have. It is kept on `globalThis` so a
 * reloaded module in development reuses the pool rather than opening another.
 */

const globalForPrisma = globalThis as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  return (globalForPrisma.prisma ??= connect());
}

function connect(): PrismaClient {
  requireRuntimeEnv("DATABASE_URL");

  // Accelerate only adds cache and waitForWindow on top of the base client, and
  // no call site uses them. Exposing its return type instead costs us Prisma's
  // relation inference: `include` given as a variable (VISIT_RELATIONS and
  // friends) resolves to the bare row type, so every read that maps to a
  // `*WithRelations` shape stops typechecking. The seam therefore stays on
  // `PrismaClient`, which is also the type call sites saw before this accessor
  // existed.
  return new PrismaClient().$extends(withAccelerate()) as unknown as PrismaClient;
}
