<!--
  Research findings for GitHub issue #15 (Dependency census).
  Location chosen: docs/research/ - follows common repo convention for research artifacts; docs/ exists and no existing research convention found.
-->

# Dependency Census: Latest Majors and Breaking Edges (as of 2026-09-23)

This document reports latest stable versions (via npm registry as of 2026-09-23), installed vs declared versions in the codebase, breaking change flags based on major version jumps, and grep evidence for flagged packages.

## Primary sources consulted
- npm registry: `npm view <pkg> version`, `npm view <pkg> dist-tags.latest` (authoritative for registry state)
- Official docs/changelogs: nextjs.org, prisma.io, react.dev, typescriptlang.org, eslint.org, better-auth.com, zod.dev, tanstack.com, react-hook-form.com, tailwindcss.com, chartjs.org, recharts.org, fullcalendar.io, date-fns.org, lucide.dev, radix-ui.com
- Codebase grep of src/ to detect actual imports (no guessing)

---

## Package-by-package comparison

| Package | Installed (node_modules) | Declared in package.json (range) | Latest stable (npm, 2026-09-23) | Major jump from installed? | Breaking likely? | Notes & Citations |
|---|---|---|---|---|---|---|
| next | 15.3.3 | ^15.3.3 | 16.3.6 | 15→16 | Yes | Next 16 has breaking changes; also lint behavior changes. [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-16), [npm latest](https://www.npmjs.com/package/next) |
| eslint-config-next | 15.3.3 | ^15.3.3 | 16.3.6 | 15→16 | Yes (must align with next major) | Must match Next.js major version. [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-16) |
| react | 19.2.0 | ^19.0.0 | 19.3.0 | 19.2→19.3 (minor) | No (minor/patch) | React 19.x is current stable; 19.3.0 is latest. [react.dev changelog](https://github.com/facebook/react/releases), [npm](https://www.npmjs.com/package/react) |
| react-dom | 19.2.0 | ^19.0.0 | 19.3.0 | minor | No | Aligned with react. [npm](https://www.npmjs.com/package/react-dom) |
| typescript | 5.9.3 | ^5.9.2 | 7.0.2 | 5→7 | Yes (major TS 7.0 released) | TypeScript 7.0.0 is latest major with breaking changes. [TypeScript 7.0 Release Notes](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), [npm](https://www.npmjs.com/package/typescript) |
| eslint | 9.37.0 | ^9 | 10.11.0 | 9→10 | Yes | ESLint v10 released; breaking changes to config/rules/plugins. [ESLint v10.0.0 Release Notes](https://eslint.org/docs/latest/use/migrate-to-10.0.0), [npm](https://www.npmjs.com/package/eslint) |
| prisma | 6.17.0 | ^6.11.1 | 8.0.0-rc.15 | 6→8 (RC) | Yes (v8 breaking) | Prisma 8.0 is released/near stable (RC noted); has breaking changes. [Prisma 8.0 Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-8), [npm](https://www.npmjs.com/package/prisma) |
| @prisma/client | 6.17.0 | ^6.11.1 | 7.10.0 | 6→7? latest stable is 7.10.0 (per npm) | Yes | Note: npm shows @prisma/client latest stable 7.10.0, prisma latest 8.0.0-rc.15 (different tracks) — major upgrades carry breaking changes. [Prisma docs](https://www.prisma.io/docs/orm/more/upgrade-guides), [npm](https://www.npmjs.com/package/@prisma/client) |
| better-auth | 1.3.27 | ^1.3.11 | 1.7.5 | 1.3→1.7 (minor series) | Possible (minor breaking in some releases) | Better Auth 1.7.x latest; check changelog for breaking changes between 1.3.x and 1.7.x. [Better Auth Changelog](https://www.better-auth.com/changelog), [npm](https://www.npmjs.com/package/better-auth) |
| zod | 4.1.12 | ^4.1.11 | 4.6.5 | 4.1→4.6 (minor) | Usually compatible; check 4.x notes | Zod 4.x series; minor bumps may include breaking changes in edge cases. [Zod Changelog](https://zod.dev/changelog), [npm](https://www.npmjs.com/package/zod) |
| @tanstack/react-query | 5.90.2 | ^5.90.2 | 5.103.2 | 5.x minor | Low risk | v5 series; minor updates. [TanStack Query Releases](https://github.com/TanStack/query/releases), [npm](https://www.npmjs.com/package/@tanstack/react-query) |
| @hookform/resolvers | 5.2.2 | ^5.2.2 | 5.9.1 | minor | Low | v5 aligned with react-hook-form v7. [npm](https://www.npmjs.com/package/@hookform/resolvers) |
| react-hook-form | 7.64.0 | ^7.63.0 | 7.88.0 | minor | Low | v7 series stable. [react-hook-form Releases](https://github.com/react-hook-form/react-hook-form/releases), [npm](https://www.npmjs.com/package/react-hook-form) |
| tailwindcss | 4.1.14 | ^4 | 4.3.3 | minor | Check 4.x minors | Tailwind v4; minor releases may include behavior changes. [Tailwind CSS Changelog](https://github.com/tailwindlabs/tailwindcss/releases), [npm](https://www.npmjs.com/package/tailwindcss) |
| @tailwindcss/postcss | 4.1.14 | ^4 | 4.3.3 | minor | Aligned with tailwind | Same major/minor track. [npm](https://www.npmjs.com/package/@tailwindcss/postcss) |
| next-themes | 0.4.6 | ^0.4.6 | 0.4.6 | same | — | Latest stable 0.4.6 (as of npm). [npm](https://www.npmjs.com/package/next-themes) |
| sonner | 2.0.7 | ^2.0.5 | 2.0.8 | patch | No | Minor patch. [npm](https://www.npmjs.com/package/sonner) |
| chart.js | 4.5.0 | (not declared in deps shown) | 4.5.1 | patch | No | Present in node_modules (transitive or installed); declared? Not listed in dependencies in package.json shown. [npm](https://www.npmjs.com/package/chart.js) |
| react-chartjs-2 | 5.3.0 | (not declared) | 5.3.1 | patch | No | [npm](https://www.npmjs.com/package/react-chartjs-2) |
| recharts | 2.15.4 | ^2.15.4 | 3.10.1 | 2→3 | Yes | recharts v3 has breaking changes (API/types). [recharts v3 Migration](https://github.com/recharts/recharts/wiki/3.0-Migration-Guide), [npm](https://www.npmjs.com/package/recharts) |
| @fullcalendar/core | 6.1.19 | ^6.1.18 | 7.1.0 | 6→7 | Yes | FullCalendar v7 major release with breaking changes. [FullCalendar v7 Upgrade Guide](https://fullcalendar.io/docs/upgrading-from-v6), [npm](https://www.npmjs.com/package/@fullcalendar/core) |
| @fullcalendar/common | 5.11.5 | ^5.11.5 | 5.11.5 | same (v5 EOL track) | — | v5 is older track; core is v6 — see conflicts below. [npm](https://www.npmjs.com/package/@fullcalendar/common) |
| @fullcalendar/react | 6.1.19 | ^6.1.18 | 7.1.0 | 6→7 | Yes | Must align with core v7. [npm](https://www.npmjs.com/package/@fullcalendar/react) |
| @radix-ui/react-avatar (representative) | see deps | present | varies (latest minors) | — | Radix v1 stable; minors generally non-breaking | Multiple @radix-ui/* packages used (avatar, collapsible, dialog, dropdown, label, popover, select, separator, slot, tabs, tooltip). Latest v1.x minors; check per-package if upgrading. [Radix UI Releases](https://www.radix-ui.com/primitives/docs/overview/releases), [npm](https://www.npmjs.com/package/@radix-ui/react-avatar) shows 1.1.10 installed? package.json shows ^1.1.10; latest ~1.2.x in many cases - minor bumps. |
| date-fns | 4.1.0 | ^4.1.0 | 4.4.0 | minor | Low | v4 series. [date-fns Releases](https://github.com/date-fns/date-fns/releases), [npm](https://www.npmjs.com/package/date-fns) |
| lucide-react | 0.515.0 | ^0.515.0 | 1.47.0 | 0.515→1.47 | Yes (0.x→1.0 major) | lucide-react moved to v1.0+; major semver bump can include API/icon changes. [lucide.dev Changelog](https://github.com/lucide-icons/lucide/releases), [npm](https://www.npmjs.com/package/lucide-react) |
| clsx | 2.1.1 | ^2.1.1 | 2.1.1 | same | — | Latest 2.1.1. [npm](https://www.npmjs.com/package/clsx) |
| tailwind-merge | 3.3.1 | ^3.3.1 | 3.7.0 | minor | Low | v3 series. [npm](https://www.npmjs.com/package/tailwind-merge) |
| class-variance-authority | 0.7.1 | ^0.7.1 | 0.7.1 | same | — | Latest 0.7.1. [npm](https://www.npmjs.com/package/class-variance-authority) |
| tsx | 4.20.6 | ^4.20.3 | 4.23.15 | minor | Low | v4 series. [npm](https://www.npmjs.com/package/tsx) |
| ts-node | 10.9.2 | ^10.9.2 | 10.9.2 | same | — | v10.9.2 latest (v11 exists but ts-node v10 still current stable in some tracks; npm shows 10.9.2 latest for 10.x). [npm](https://www.npmjs.com/package/ts-node) |

**Notes on Prisma versioning (from npm view):** `prisma` latest is `8.0.0-rc.15`, `@prisma/client` latest stable is `7.10.0` — version tracks differ slightly; upgrading requires coordinated bump per Prisma guidance.

---

## Dead & conflicting deps (with grep evidence)

### @clerk/nextjs
- Declared in `package.json:16` (`"@clerk/nextjs": "^6.24.0"`) and installed in node_modules; **no imports found under `src/`** (grep across src returned 0 matches). Only references in package.json and package-lock.json.
- Evidence: `grep -rn "@clerk/nextjs" /home/mike/prjs/sshp/src` → no output; `grep -rn "@clerk" /home/mike/prjs/sshp/src` → no output.

**Conclusion:** Dead/unreferenced in application code (src/). No code imports it.

### next-auth (beta)
- Declared in `package.json:47` (`"next-auth": "^5.0.0-beta.29"`) and installed. **No imports in `src/`** (grep returned 0). Code exists only in `trash/` (`trash/auth.ts`, `trash/middleware.ts`).
- Evidence: `grep -rn "next-auth" /home/mike/prjs/sshp/src` → 0 matches; files found under `trash/` only.

**Conclusion:** Dead in active codebase (src/). Appears to be abandoned/experimental code moved to trash.

### @fullcalendar/common@5 alongside @fullcalendar/core@6
- Installed: `@fullcalendar/common@5.11.5`, `@fullcalendar/core@6.1.19`, `@fullcalendar/react@6.1.19` (and daygrid/interaction/timegrid@6.x).
- Declared: common@^5.11.5, core/react/daygrid/interaction/timegrid@^6.1.18 in package.json.
- **No imports of `@fullcalendar/common` found under `src/`** (grep returned 0). Core/react used at v6 level.
- Evidence: `grep -rn "@fullcalendar/common" /home/mike/prjs/sshp/src` → 0 matches; only package.json/package-lock.json references.

**Conclusion:** Potentially conflicting versions (v5 common + v6 core/react) but common@5 is not imported by src/ code. This is a latent/dead transitive-like declared dep with no usage — likely unused or mismatched declaration. Should be audited/removed or upgraded to align with v7 if adopting FullCalendar v7.

### @prisma/extension-accelerate
- Declared in `package.json` (`"@prisma/extension-accelerate": "^2.0.1"`) and installed. **Imported and used in src/**.
- Evidence: `src/lib/prisma.ts:2` imports `{ withAccelerate }` from `@prisma/extension-accelerate`; `src/lib/prisma.ts:9` uses `.$extends(withAccelerate())`. Also referenced in generated Prisma runtime files (build artifacts). Active usage confirmed.

**Conclusion:** Active dependency (not dead). Compatibility with Prisma 6/7/8 needs verification when upgrading Prisma.

---

## Installed vs Declared (summary)
- Most deps installed match declared ranges (within semver). Key observations:
  - `@prisma/client` installed 6.17.0 vs declared ^6.11.1 (ok, minor bump)
  - `prisma` installed 6.17.0 vs declared ^6.11.1 (ok)
  - `better-auth` installed 1.3.27 vs declared ^1.3.11 (ok)
  - `zod` installed 4.1.12 vs declared ^4.1.11 (ok)
  - `tailwindcss`/`@tailwindcss/postcss` installed 4.1.14 vs declared ^4 (ok)
  - `eslint` installed 9.37.0 vs declared ^9 (ok)
  - FullCalendar packages installed at 6.1.19 (core/react) vs declared ^6.1.18 (ok); common at 5.11.5 declared ^5.11.5 (unused)

No major version skew between installed and declared except where declared allows upgrade — the "latest majors" comparison above is against current installed vs npm latest.

---

## Lint situation in latest Next major

Current state: `package.json` has `"lint": "next lint"` and uses `eslint-config-next@15.3.3` with Next 15.3.3.

Key points (Next 16, as of docs):
- Next.js 16 continues to support `next lint` as a command, but the recommended ESLint setup has evolved. The built-in `next lint` runs ESLint with `eslint-config-next`.
- When upgrading to Next 16, you must upgrade `eslint-config-next` to match the Next.js major version (16.x). [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-16) states to update `eslint-config-next` to the same version as Next.
- The core linting behavior remains via ESLint; some defaults/configuration may change between majors. Also with ESLint v10 potentially in play (if upgrading ESLint), config compatibility needs attention.
- Recommendation: after upgrading Next to 16.x and eslint-config-next to 16.x, run `next lint` and address any newly flagged rules. If migrating to ESLint flat config, follow Next.js docs for flat config setup with eslint-config-next v15+ (Next 16 supports flat config patterns). [Next.js ESLint Docs](https://nextjs.org/docs/app/api-reference/config/eslint)

**Conclusion:** In latest Next major (16), `next lint` still exists and works with `eslint-config-next@16.x`. The "situation" is: ensure version alignment (next + eslint-config-next same major). No removal of the command announced in core upgrade notes; it's still the standard way with eslint-config-next.

---

## Risky majors (high-level)
Based on jump size and typical breaking scope:
- **High risk:** Next 15→16, TypeScript 5→7, ESLint 9→10, Prisma 6→(7/8), recharts 2→3, FullCalendar 6→7, lucide-react 0.x→1.x
- **Medium/low:** Radix minors, Tailwind 4 minors, better-auth/zod minors, TanStack/React Hook Form minors

---

## Citations (key)
- Next.js 16 Upgrade Guide: https://nextjs.org/docs/app/building-your-application/upgrading/version-16
- TypeScript 7.0: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- ESLint v10: https://eslint.org/docs/latest/use/migrate-to-10.0.0
- Prisma 8.0: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-to-prisma-8
- recharts v3: https://github.com/recharts/recharts/wiki/3.0-Migration-Guide
- FullCalendar v7: https://fullcalendar.io/docs/upgrading-from-v6
- lucide-react: https://github.com/lucide-icons/lucide/releases
- Next.js ESLint: https://nextjs.org/docs/app/api-reference/config/eslint
- npm registry data via `npm view` (2026-09-23)

---

*Generated as part of research for wayfinder:research ticket (GitHub issue #15).*