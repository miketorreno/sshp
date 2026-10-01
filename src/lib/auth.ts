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
 * The role and the active flag are named as additional fields so the session
 * carries who the clinician is, which is what `src/server/access.ts` asks about
 * before it lets a read or a write proceed. Both are `input: false`: a request
 * that signs itself up cannot choose its own role or hand itself an active
 * account, so escalation has to happen in the database, deliberately.
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
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: "USER",
          input: false,
        },
        isActive: {
          type: "boolean",
          required: true,
          defaultValue: true,
          input: false,
        },
      },
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
