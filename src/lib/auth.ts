import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { getPrisma } from "@/lib/prisma";
import { requireRuntimeEnv } from "@/lib/runtime-env";

/**
 * The auth seam: sign-up, sign-in, sign-out, and the session every domain read
 * and write is authenticated against.
 *
 * `betterAuth()` reads the secret and reaches the database while it is being
 * constructed, so it is built on first use rather than at import: `next build`
 * imports this module to collect page data, and a builder is not a place that
 * holds either. Like the database seam it is kept on `globalThis`, so a reloaded
 * module in development reuses the instance rather than building a second one.
 *
 * Role permissions are deliberately not modelled here: session presence is the
 * only authorization rule until a role matrix is decided.
 */

export type Auth = ReturnType<typeof buildAuth>;

function buildAuth() {
  return betterAuth({
    database: prismaAdapter(getPrisma(), {
      provider: "postgresql",
    }),
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      // github: {
      //   clientId: process.env.GITHUB_CLIENT_ID as string,
      //   clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      // },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
    },
    plugins: [nextCookies()],
  });
}

const globalForAuth = globalThis as { auth?: Auth };

export function getAuth(): Auth {
  return globalForAuth.auth ??= buildForRuntime();
}

function buildForRuntime(): Auth {
  // Better Auth accepts either name, and warns about a weak one either way, so
  // this only insists that one of them was configured.
  requireRuntimeEnv("BETTER_AUTH_SECRET", "AUTH_SECRET");

  return buildAuth();
}
