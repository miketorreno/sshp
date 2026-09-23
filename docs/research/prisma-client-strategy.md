# Prisma client generation strategy for sshp — research findings

Researched 2026-09-23 for ticket issue #16 (wayfinder:research). AFK fact-finding; no decisions
made here. A later modernization ticket consumes these facts.

**Where this file lives:** the repo has no existing docs convention, so this is placed at
`docs/research/prisma-client-strategy.md` (new `docs/research/` directory), matching the ticket's
prescribed path and the repo's agent-docs layout (`CONTEXT.md` + `docs/adr/` promised in AGENTS.md).
Each claim is cited to the primary source that owns it. Line numbers below are `file:line` in the
repo as of the research date.

---

## 0. Where sshp sits right now (ground truth from the repo)

- `prisma/schema.prisma:1-9` — generator `prisma-client-js` with `output = "../src/generated/prisma"`;
  second generator `prisma-zod-generator` with `output = "../src/generated/zod"`.
- `package.json:24,69` — `@prisma/client: ^6.11.1`, `prisma: ^6.11.1`. **package-lock resolves to
  `prisma 6.11.1` / `@prisma/client 6.16.2`** — sshp is on Prisma v6, the legacy line.
- `src/lib/prisma.ts:1,9` — imports `PrismaClient` from `../generated/prisma` (the v6 barrel) and
  wraps it in `new PrismaClient().$extends(withAccelerate())` (`@prisma/extension-accelerate` `^2.0.1`,
  `package.json:25`).
- `src/lib/auth.ts:4` — imports `PrismaClient` from `@/generated/prisma` (alias `@/* -> ./src/*`,
  `tsconfig.json:21-23`).
- `prisma/seed.ts:2,5` — imports `PrismaClient` from `@prisma/client` (the node_modules client), not
  the custom output. Seed command lives in `package.json:12-14` (`"prisma": { "seed": "ts-node --esm prisma/seed.ts" }`).
- The generated v6 client resident in `src/generated/prisma/` (gitignored, `.gitignore:45`) contains
  **classic Rust-engine artifacts**: `libquery_engine-*.so.node`, `query_engine_bg.js`/`.wasm`, plus
  `client.js`/`index.js`/`edge.js` entries. This is the deploy-relevant fact for a v6 app.
- No `src/` import of the zod output (grep: zero hits for `generated/zod`) — it is generated but not
  yet consumed by app code.
- `next.config.ts` has **no** `output: "standalone"`; there is **no** `Dockerfile`, docker-compose, or
  GitHub Actions workflow in the repo.

---

## 1. Current Prisma major + recommended provider

### 1.1 Version landscape as of 2026-09-23

| Line | Package | npm `latest` | Notes |
| --- | --- | --- | --- |
| Prisma ORM 8 (current release) | `prisma` CLI | `8.0.0-rc.15` | Unified CLI, versioned separately from ORM packages |
| | `@prisma/orm-postgres` | `8.0.0-rc.11` | v8 Postgres runtime; replaces `@prisma/client` |
| Prisma ORM 7 (previous, fully supported) | `@prisma/client` | `7.10.0` | Last major using the classic package names; `prev` tag = `6.19.3` |
| | `prisma` (7) | via `prisma@prev` / `@prisma/prisma7@7.10.0` | 7.10.0 shipped 2026-08-25 |
| Prisma ORM 6 (legacy) | — | `6.19.3` (prev of 7) | sshp runs 6.11.1/6.16.2; docs "maintained for backwards compatibility only" |

Sources: `npm view prisma dist-tags` and `npm view @prisma/client dist-tags` (npm registry, 2026-09-23);
prisma/orm GitHub releases (7.10.0 tag, 2026-08-25; v8.0.0-rc.11, 2026-09-13); Prisma docs index
`https://www.prisma.io/docs/llms.txt` ("Current Prisma ORM (Prisma ORM 8)…", "Prisma ORM 7 remains
fully supported; install the CLI as prisma@prev and the client as @prisma/client@7",
"Prisma ORM v6 (legacy)… maintained for backwards compatibility only").

**Prisma ORM 8 is "the current release"** per Prisma's own docs (the v7 upgrade guide opens with
"Prisma ORM 8 is the current release"; docs landing page: "Prisma 8 is here. The docs now default to
Prisma 8."). It is still on a release-candidate line: the `prisma` CLI's `latest` dist-tag is
`8.0.0-rc.15` and `@prisma/orm-postgres@latest` is `8.0.0-rc.11`. v8 is a ground-up TypeScript
rewrite (contract-first, see §1.3) — a project moving from v6 is documented to land on **v7 first**
(in-place, same package names) or to migrate to **v8** with a rewrite (`Prisma ORM 7 to 8 (PostgreSQL)`
upgrade guide). This is the "current + next" pair the ticket asks about: **current = 8 (RC), next = 8
stable / 7→8 migration**; for a v6 app the immediately reachable, fully-supported major is **7**.

### 1.2 Recommended provider: `prisma-client`, not `prisma-client-js`

- In **v7**, the `prisma-client` generator is **"the default generator"** and `prisma-client-js` is
  **deprecated**: "The `prisma-client-js` generator is deprecated. We recommend using `prisma-client`".
  Prisma v7 upgrade guide: "The older `prisma-client-js` provider **will be removed in future
  releases** of Prisma ORM." (Sources: upstream docs `Generators (Prisma ORM v7)` §"prisma-client-js
  (Deprecated)"; `Upgrade to v7` §"Schema changes".)
- v7.0.0 shipped 2025-11-19 with "Rust-free Prisma Client as the default" (prisma changelog
  `v7.0.0`). The new generator was Preview in v6.12.0 (2025-07-17) and GA with "driver adapters GA"
  in v6.16.0 (2025-09-10) — i.e. even inside v6 the direction was already set.

### 1.3 What the newer generator changes (and what v8 does instead)

`prisma-client` generator (v7) — from the generator reference:
- **`output` is required**; "no 'magic' generation into `node_modules' any more". Default example
  path is `../generated/prisma`. (Upstream docs: `Generators (Prisma ORM v7)` §"prisma-client";
  `Generating Prisma Client (Prisma ORM v7)` "In Prisma ORM v7, the `output` field is required".)
- Generated layout is **split into multiple files**: `client.ts` (server entry; full API),
  `browser.ts` (types/browser, no `PrismaClient`), `enums.ts`, `models.ts` + `models/<Model>.ts`,
  `commonInputTypes.ts`, `internal/*` (private). (Generator reference §"Importing types".)
- **Import path becomes `{output}/client`** (e.g. `./generated/prisma/client`), not the directory
  barrel. Model types are exposed as `<Model>Model` in `models.ts` but `<Model>` in `client.ts`/
  `browser.ts`. (Generator reference §"client.ts", §"models.ts".)
- Config fields: `moduleFormat` (`esm` | `cjs`, inferred from environment / nearest `package.json`
  `type`), `generatedFileExtension` (`ts`|`mts`|`cts`), `importFileExtension` (`ts`|`mts`|`cts`|
  `js`|`mjs`|`cjs`|empty), `runtime` (`nodejs`|`deno`|`bun`|`workerd`|`vercel-edge`|`react-native`),
  plus `compilerBuild` (a v7.3.0 feature for smaller/faster query compilers — prisma changelog
  `v7.3.0`). (Generator reference §"Field reference"; 7.10.0 release notes fix `moduleFormat`
  inference for `node16`/`nodenext`.)
- Breaking differences vs `prisma-client-js`: requires `output`; **does not load `.env` at runtime**;
  ESM/CJS support; no `Prisma.validator` (use `satisfies`). (Generator reference §"Breaking changes
  from prisma-client-js".)
- **tsx/imports alias gotcha**: generated client uses `.js` extensions in imports (ESM convention);
  `tsx` cannot resolve them unless you set `importFileExtension = "ts"` ("Cannot find module
  './internal/class.js'"). A matching Next.js/Turbopack module-resolution failure was reported under
  the new generator (`Can't resolve './enums.js'`, `./internal/class.js`) — prisma/orm issue #27079.
- **v8 replaces generators entirely**: the schema/generator model gives way to contract-first authoring
  (`contract.prisma` / TypeScript contract; `prisma contract infer|emit`), generated type artifacts
  (`contract.json` + `contract.d.ts`), and a runtime imported from `@prisma/orm-postgres/runtime`
  (`postgres<Contract>({ url, contractJson })`, queries like `db.orm.public.User...`). There is no
  `prisma-client` / `prisma-client-js` generator block in the v8 guides. (Sources: `Prisma ORM 7 to 8
  (PostgreSQL)` guide §2–§3; v8 `Next.js` guide "Where things live".)

---

## 2. Driver adapters vs the classic query engine

- **v6 (sshp today):** classic Rust query engine is the default and is what sshp actually ships —
  the resident client in `src/generated/prisma/` contains `libquery_engine-*.so.node` +
  `query_engine_bg.{js,wasm}`. Driver adapters went GA in 6.16.0 but are optional on v6.
- **v7 (current for in-place upgrades): driver adapters are REQUIRED for all databases.** Client
  construction becomes:
  ```ts
  import { PrismaPg } from "@prisma/adapter-pg";
  import { PrismaClient } from "./generated/prisma/client";
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  ```
  The old `datasources`/`datasourceUrl` constructor options are gone; `assets` are available via
  adapter options only. (Sources: `Upgrade to v7` §"Driver adapters"; `Database drivers (Prisma ORM
  v7)`; PostgreSQL page §"Using driver adapters".)
- **Driver choice:** PostgreSQL → `@prisma/adapter-pg` (the `pg` driver), with `pg` (+ `@types/pg`)
  installed alongside. Serverless variants exist (Neon, Prisma Postgres serverless). (Database
  drivers + PostgreSQL pages; the v7 Next.js guide installs `@prisma/adapter-pg pg dotenv @types/pg`.)
- **DATABASE_URL parsing — what actually changes:**
  - The URL is still a single `postgresql://...` (or `postgres://...`) connection string; the format
    does not change. It is no longer parsed by Prisma's Rust engine; it is handed to the JS driver.
  - Where it is declared moves: in v7 the **CLI/datasource URL lives in `prisma.config.ts`**
    (`datasource.url`, with `dotenv`/`env()` — v7 CLI does not load `.env` by default), while the
    **runtime connection string is passed by application code into the adapter**. If it is missing at
    runtime, `pg` falls back to its own defaults and you get `SASL: SCRAM-SERVER-FIRST-MESSAGE: client
    password must be a string`. (Upgrade to v7 §Environment variables / §Prisma config; PostgreSQL
    page §"Using driver adapters".)
  - **SSL semantics changed:** with `node-pg`, TLS is negotiated by the driver; previously (Rust
    engine) invalid certs were ignored, now you may hit `P1010`; escape hatch is
    `ssl: { rejectUnauthorized: false }` or `NODE_EXTRA_CA_CERTS`/`--use-openssl-ca`. URL `sslmode`
    params (`prefer` default) and `sslcert` still work. (Upgrade to v7 §"SSL certificate validation
    changes"; PostgreSQL page "Self-hosted PostgreSQL" table.)
  - **Pool defaults change:** driver adapters use `pg` defaults — connection timeout `0` (v6: 5s),
    idle timeout `10s` (v6: 300s). Pool sizing/tuning is the adapter's, not Prisma's. (Upgrade to v7
    §"Driver adapters" warning; PostgreSQL page "Connection pool defaults (Prisma ORM v7)".)
- **v8 keeps the driver-based model** (connection configured via `prisma.config.ts`,
  `db.connection: process.env["DATABASE_URL"]`), with the ORM runtime doing the query planning
  (v8 rc.5 notes "Postgres runtime attaches 'error' listeners to every pool and client"). (v7→v8
  guide §2.2; prisma/orm release notes v8.0.0-rc.5.)

---

## 3. Implications for sshp (import path, seed, zod generator, extension-accelerate, standalone)

### 3.1 `@/generated/prisma` import path

- Today sshp imports the **directory barrel** of the v6 custom output (`../generated/prisma` →
  `@/generated/prisma`). Under the v7 `prisma-client` generator the entry point is **`{output}/client`**,
  so imports become `@/generated/prisma/client` (`src/lib/prisma.ts`, `src/lib/auth.ts`, and every
  other site). The `@/*` alias itself needs no change, but the per-file split (§1.3) means types can
  alternatively come from `@/generated/prisma/models` etc.
- Keep `output = "../src/generated/prisma"`: sshp's custom output already matches the v7 requirement
  (`output` required) and the default `../generated/prisma`; it stays gitignored (`/src/generated/`)
  and generated at build time.
- moduleFormat/importFileExtension will need a deliberate setting for the Next.js 15.3 + Turbopack
  setup (`importFileExtension` — see §1.3 tsx/Turbopack gotcha and issue #27079). tsconfig is
  `module: "esnext"`, `moduleResolution: "bundler"` (`tsconfig.json:10-11`), so bundler resolution
  applies.

### 3.2 `prisma/seed.ts`

- `prisma/seed.ts:2` imports from `@prisma/client` — the node_modules client. With custom `output`
  this import is already inconsistent (the generated client lives at `src/generated/prisma`); under
  v7 `@prisma/client` no longer contains a client at all when the `prisma-client` generator
  (custom output) is used. Seed must import from the generated path **and pass a driver adapter**
  ("In Prisma ORM v7, `PrismaClient` must be initialized with a driver adapter").
- v7 seeding changes: the `"prisma": {"seed": ...}` key in `package.json` moves to
  `prisma.config.ts` (`migrations.seed: "tsx prisma/seed.ts"`); seeding is **only triggered
  explicitly** via `prisma db seed` — `migrate dev`/`migrate reset` no longer auto-seed in v7; and
  `migrate dev`/`db push` no longer run `prisma generate` automatically (must run explicitly).
- (v8 note: the v8 template seeds sample data on first query; the seed-script model changes again.)

### 3.3 `prisma-zod-generator`

- Repo has `prisma-zod-generator` `^1.21.4` (`package.json:70`); current npm `latest` is **3.3.1**.
  v3's README states requirements: **Prisma 7.x**, Node >= 20.19 (22.x rec), Zod **>= 3.25 < 5**
  (both v3 and v4 Zod output emitted — sshp is on zod `^4.1.11`, in range), TypeScript >= 5.4.
- v3 is explicitly designed to sit **alongside the `prisma-client` generator** (README usage example
  shows `generator client { provider = "prisma-client" }` + `generator zod {
  provider = "prisma-zod-generator" }`). Default output is `<schema dir>/generated`; sshp already
  pins `output = "../src/generated/zod"`.
- Mitigation: PZG schemas type values against the `Prisma` namespace (`z.ZodType<Prisma.<Model><Op>Args>`),
  so its import wiring to the generated client must be checked during modernization
  (`zodImportTarget`/`zodImportPath` config exists). Also note today no `src/` code imports the zod
  output yet, so breakage surface is currently small.
- It remains a "community generator" per Prisma docs (which list `prisma-zod-generator`); nothing in
  Prisma-primany support changes that, but the 1.x → 3.x jump is required for v7.

### 3.4 `@prisma/extension-accelerate` (retirement)

- **Standalone Accelerate and hosted `prisma+postgres://acle-as.net` connections are retired
  December 1, 2026.** (Upgrade to v7 §"Prisma Accelerate"; Accelerate docs "Keep your existing
  database": "Standalone Prisma Accelerate will be retired on December 1, 2026.") Removal guide from
  the Accelerate docs covers exactly sshp's current shape (`withAccelerate` + `$extends`).
- In v7 the *temporary* Accelerate path is `new PrismaClient({ accelerateUrl: process.env.DATABASE_URL })
  .$extends(withAccelerate())` — **do not** pass the Accelerate `prisma://` URL to a driver adapter
  (`PrismaPg` fails on `prisma://`). Long-term: remove the extension, connect through the adapter.
- sshp today wraps every client (including better-auth's in `src/lib/auth.ts`? no — auth.ts constructs
  a plain `new PrismaClient()`, `src/lib/auth.ts:6`) with `withAccelerate()` (`src/lib/prisma.ts:9`)
  but passes no `accelerateUrl`; the extension only engages with Accelerate-style `prisma://` URLs,
  so with a plain `postgresql://` DATABASE_URL it is effectively inert. npm latest for the package is
  `3.0.1` (repo has `^2.0.1`). **Decision for modernization: drop `@prisma/extension-accelerate`
  entirely (pre-retirement), or pin to 3.x only as a Dec-2026-stopgap.** Do not carry it into v8.

### 3.5 Next.js `output: "standalone"` compatibility

- **The repo does not set `output: "standalone"` today** (`next.config.ts:3-21`); no Dockerfile. So
  this is forward guidance, not an existing break.
- Next.js `output: "standalone"` does automated file tracing of each route + node_modules
  (`.next/standalone/`), with `outputFileTracingIncludes`/`outputFileTracingExcludes`/
  `outputFileTracingRoot` knobs for things the tracer misses (Next.js output docs).
  The docs' canonical example for native/runtime assets is `outputFileTracingIncludes: { '/*':
  [...] }`.
- **Known pitfall (v6 / classic engine, which is sshp today):** the Rust engine artifacts
  (`libquery_engine-*.so.node`, `query_engine_bg.wasm`, `schema` files under
  `node_modules/.prisma/client` or the custom output) are loaded via `fs`/`spawn` and are not always
  statically traceable → engine "not found" at runtime in traced/standalone/vercel/pkg deployments;
  fixes involve including them (e.g. `pkg.assets: ["node_modules/.prisma/client/*.node"]` per the v7
  bundler-issues page, or `outputFileTracingIncludes`). prisma/orm issue #27079 documents the new
  generator's *TS*-trace problem; discussion #29339 documents "Query Engine not found on Vercel with
  custom output". Since sshp's engine binary lives inside the gitignored `src/generated/prisma/`,
  every v6-style deployment must ensure that directory (with the engine) is produced by `prisma
  generate` **at build time** and lands in the final bundle.
- **v7+ largely removes the native-trace pitfall:** the client is Rust-free (query compiler as WASM
  on the JS main thread, per changelog v7.4.0; lean package), and the only server-side dependency to
  trace is the pure-JS `pg` driver. Vercel/Next guides also recommend adding `postinstall: "prisma
  generate"` (or failing that, `prisma generate && next build`) because Vercel/Netlify cache
  dependencies and the old auto-generation postinstall does not re-run (v7 Next.js troubleshooting
  page, Vercel/Netlify sections). Standalone is the explicitly blessed output mode in the v8 / Prisma
  Compute guides (`output: "standalone"` required, template sets it).
- Turbopack-specific caveat carries over regardless: the generated client's `.js`-suffixed relative
  imports must resolve (see §1.3 / issue #27079).

### 3.6 `prisma generate` in Docker images

- **No Dockerfile exists in this repo today** — facts for the modernization ticket, not a break.
- v7: `migrate dev`/`db push` no longer trigger `generate`; generate must run explicitly. Docker
  pattern from the v7 Docker guide: `npm ci` inside the image, `migrate deploy && generate`
  (their `db:deploy` script) at container start, custom `output` so the client resolves inside the
  container regardless of package-manager layout. In practice for a Next app: run `prisma generate`
  **before `next build`** so the generated client (gitignored, so not committed) exists in the
  build image.
- v7 CLI no longer loads `.env` itself → `prisma generate`/`migrate` in the image need DATABASE_URL
  present (or `dotenv` in `prisma.config.ts`); `prisma generate` itself doesn't connect to the DB,
  but the CLI reads the datasource config.
- Alpine/musl is supported for the Rust-free client (v7 Docker guide notes engine/glibc caveats
  apply to the classic Rust engines, i.e. v6; do not install `libc6-compat` thinking it helps).
- New in 7.10.0: `prisma generate` may print an interactive "install agent skills?" prompt; it is
  auto-skipped in CI/containers/git hooks/npm lifecycles, and `--no-hints` disables it — worth
  pinning in Docker/CI commands for determinism.
- postinstall vs build ordering: with the generated output gitignored, `postinstall: prisma generate`
  (recommended by the v7 Next.js guide for Vercel/Netlify) plus an explicit pre-build generate are
  the two safe patterns.

---

## 4. Facts a modernization ticket needs (no decisions made here)

1. **Target major:** sshp is on Prisma v6 (lock: prisma 6.11.1 / @prisma/client 6.16.2). As of
   2026-09-23, current = **Prisma ORM 8** (RC line: `prisma@latest` 8.0.0-rc.15,
   `@prisma/orm-postgres@latest` 8.0.0-rc.11); previous, fully-supported = **Prisma ORM 7**
   (7.10.0 stable) on the classic packages. v6 is legacy. The documented v6→7 path is in-place;
   v7→8 is an incremental rewrite (contract-first). 
   - *npm evidence:* `@prisma/client` latest 7.10.0, prev 6.19.3; `prisma` latest 8.0.0-rc.15, prev 7.10.0, next 8.0.0-rc.10; `@prisma/adapter-pg` 7.10.0.
   - *Docs evidence:* llms.txt (v8 current, v7 supported, v6 legacy); Upgrade-to-v7 ("Prisma ORM 8 is the current release"); v7→v8 (PostgreSQL) guide; GitHub prisma/orm releases.
2. **Provider:** in v7, use `provider = "prisma-client"` (default, Rust-free); `prisma-client-js` is
   deprecated and slated for removal. `output` becomes **required** — sshp's
   `output = "../src/generated/prisma"` already satisfies this. In v8 the generator model is gone
   (contract + `@prisma/orm-postgres` runtime).
3. **Import path:** v7 new generator lays out `{output}/client.ts` (+ `browser.ts`, `enums.ts`,
   `models.ts`, `models/<Model>.ts`, `internal/*`). sshp's `@/generated/prisma` → `@/generated/prisma/client`
   (and any type splits). `moduleFormat`/`importFileExtension` need explicit choice for Next.js 15.3 +
   Turbopack (see issue #27079 / tsx `importFileExtension = "ts"` note). No more `Prisma.validator`
   (use `satisfies`).
4. **Driver adapters mandatory in v7:** `new PrismaPg({ connectionString: process.env.DATABASE_URL })`
   + `new PrismaClient({ adapter })`. DATABASE_URL format unchanged, but it is consumed in app code
   by the adapter (and declared for the CLI in `prisma.config.ts`); SSL and pool defaults now come
   from the `pg` driver (P1010 on bad certs; timeout defaults 0s/10s vs v6 5s/300s).
5. **`prisma/seed.ts`:** switch import from `@prisma/client` to the generated path + adapter; move the
   seed command from `package.json` `"prisma.seed"` to `prisma.config.ts` `migrations.seed`; expect
   no auto-seed from `migrate dev` and no auto-`generate` from `migrate dev`/`db push` in v7.
6. **Zod generator:** bump `prisma-zod-generator` 1.21.4 → **3.3.1** (requires Prisma 7.x, zod 3.25–5,
   TS ≥5.4; pairs with `prisma-client`); verify `Prisma`-namespace import wiring to the new client
   layout. Note zod output currently has zero imports in `src/`.
7. **`@prisma/extension-accelerate`:** Accelerate retires **Dec 1, 2026**. Current sshp usage
   (`$extends(withAccelerate())`, no `accelerateUrl`, plain postgres URL) is inert and should be
   removed (dropping the dep) or kept only as a v7 stopgap via `accelerateUrl`. Never hand a
   `prisma://` URL to `PrismaPg`.
8. **Standalone:** `next.config.ts` does not set `output: "standalone"` today. v6 ships the native
   engine inside the gitignored custom output — deployments must generate it at build time and trace
  /include it (historic `outputFileTracingIncludes` / `pkg.assets` pattern, prisma issue #27079,
   discussion #29339). v7+ is Rust-free, so only the JS `pg` driver needs tracing; keep
   `postinstall`/pre-build `prisma generate` to defeat Vercel/Netlify dependency caching.
9. **Docker/CI:** no Dockerfiles/actions exist now. When added: generate explicitly before build
   (v7 `migrate dev` won't do it), load DATABASE_URL via `prisma.config.ts`+dotenv or pass env,
   ignore (or pin) the interactive skills prompt (`--no-hints`), and prefer `node:slim` over
   `node:alpine` short of a v7 Rust-free client (classic-engine alpine caveats are v6-only).

---

## 5. Cited primary sources

- Prisma docs, `llms.txt` index: https://www.prisma.io/docs/llms.txt (incl. `orm.txt`, `orm-v7.txt`, `orm-v6.txt` area indexes)
- Prisma ORM 7 generators reference: https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators
- Generating Prisma Client (v7): https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/generating-prisma-client
- Upgrade to v7: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7
- Prisma ORM 7 → 8 (PostgreSQL): https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql
- Prisma ORM v7 Next.js guide: https://www.prisma.io/docs/guides/v7/frameworks/nextjs
- Next.js troubleshooting (v7): https://www.prisma.io/docs/orm/v7/more/troubleshooting/nextjs
- Database drivers (v7): https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/database-drivers
- PostgreSQL (v7): https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql
- Docker (v7): https://www.prisma.io/docs/guides/v7/deployment/docker
- Seeding (v7): https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding
- Bundler issues (v7): https://www.prisma.io/docs/orm/v7/more/troubleshooting/bundler-issues
- Accelerate — keep your database: https://www.prisma.io/docs/accelerate/keep-your-database
- Prisma changelog: https://www.prisma.io/changelog
- GitHub releases prisma/orm: https://github.com/prisma/orm/releases (7.10.0; v8.0.0-rc.11)
- npm registry: `npm view prisma|@prisma/client|@prisma/adapter-pg|@prisma/orm-postgres|prisma-zod-generator|@prisma/extension-accelerate dist-tags/version`
- prisma-zod-generator README: https://github.com/omar-dulaimi/prisma-zod-generator
- Next.js output file tracing: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- prisma/orm issue #27079 (new generator module resolution in Next/Turbopack); prisma discussion #29339 (query engine not found with custom output)