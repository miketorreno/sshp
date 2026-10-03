---
status: accepted
date: 2026-09-26
---

# Server modules read no runtime state at import

No server module will read `process.env` or construct a database client while it is being imported. The database client, the auth system, and the runtime variables behind them are built on first use, so `next build` — which imports every server module to collect page data — reaches neither a database nor a secret.

## Why

`next build` collects page data by loading the app's server modules. Both `src/lib/prisma.ts` and `src/lib/auth.ts` built at module scope, so the builder asked Prisma for a database and Better Auth for a session secret. The build still exited zero, so the coupling was invisible: it surfaced only as `PrismaClientInitializationError` diagnostics (`P1001` against a `localhost` URL, `P1012` when the builder had no URL at all) and Better Auth default-secret and base-URL warnings, none of which changed the build's exit code. The Docker builder made this visible by having no `.env*` in its build context, so the same noise appeared in a log nobody was reading for failures.

A second leak was the order of operations in `getSession()`. `getAuth().api.getSession({ headers: await headers() })` evaluates the auth system before `headers()`, and `headers()` is how Next signals that a render has no request scope. A page collection is exactly such a render, so it constructed the auth system on its way to being told there was no request. Resolving the headers first is what makes the session guard a runtime-only seam.

## Rules

- A module-scope statement may not read `process.env`, construct a client, or call a library that reads configuration while constructing.
- `getPrisma()` and `getAuth()` are the only ways to reach the database and the auth system. Both memoize on `globalThis`, so a reloaded module reuses the client and the auth system rather than opening a second pool. There is one database client, and auth shares it.
- Values come from `requireRuntimeEnv()` in `src/lib/runtime-env.ts`, which names the variable it wanted. This replaces a library's diagnostic with an actionable one; it does not replace the library's own validation, and it accepts the fallbacks the libraries accept (`AUTH_SECRET` for `BETTER_AUTH_SECRET`).
- Runtime validation is not weakened to make the build pass. A missing `DATABASE_URL` or auth secret still fails, at the first request that needs it, and the failure says which variable to set.
- `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` are runtime variables. They are not build inputs, must not be baked into an image, and are absent from the Docker builder by design (`.dockerignore` excludes `.env*`). The first two are the ones the app insists on via `requireRuntimeEnv()`; `BETTER_AUTH_URL` is Better Auth's to read, and the app gates on it not at all.
- A build-time placeholder, a `SKIP_*` style bypass, or a relaxed check in the auth library is not an acceptable way to make a build quiet. If a build needs to know something, that is a signal the value belongs to a different module.

## Consequence

`npm run build` and the Docker builder produce no Prisma or Better Auth diagnostics, whether or not a database is reachable, and the route table is unchanged. The cost is that a misconfigured deployment now fails on the first request rather than at boot; the failure message names the variable and points at the README.

Test seams: `src/lib/auth.test.ts` and `src/lib/prisma.test.ts` watch that importing a module builds nothing and that first use builds exactly once, and `src/lib/session.test.ts` watches that the request is resolved before the auth system that reads it. None of them needs a database, which is the point — these seams used to be unreachable without one.
