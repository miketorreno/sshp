# sshp

An Electronic Health Record (EHR) web application built with Next.js.

**Purpose:** a focused interface for managing patients, appointments, visits, orders, and vitals used as a reference implementation and internal tool.

**Status:** active development on the `dev` branch. See the `migrations/` folder for database schema history.

## Key Features

- Appointment scheduling and calendar views
- Patient management and quick search
- Visit records and vitals tracking
- Orders and labs workflow scaffolding
- Authentication and role-aware UI

## Tech Stack

- Frontend: Next.js + React + TypeScript
- Styling: global CSS & PostCSS (project uses component-driven UI)
- Backend / ORM: Prisma with PostgreSQL
- Auth: NextAuth
- Tooling: Node.js, npm, ESLint, PostCSS

## Quickstart

Prerequisites:

- Node.js 18+ installed
- PostgreSQL (local or remote) for development

Typical setup:

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env

# 3. Run database migrations and seed (if applicable)
npx prisma migrate dev --name init
npx prisma db seed

# 4. Start the dev server
npm run dev

# Open http://localhost:3000
```

Notes:

- Generated Prisma client is in `src/generated/prisma` (do not commit local engine files).
- If you use a different package manager, replace `npm` with `yarn` or `pnpm`.

## Scripts

- `npm run dev` — run the Next.js development server
- `npm run build` — build the production app
- `npm run start` — run the production build
- `npx prisma generate` — regenerate Prisma client
- `npx prisma migrate dev` — create/apply migrations

## Environment Variables

At minimum, set:

- `DATABASE_URL` — Postgres connection string
- `NEXTAUTH_SECRET` — secret for NextAuth
- `NEXTAUTH_URL` — (optional) canonical app URL for auth callbacks

There may be additional provider-specific variables required for OAuth providers configured in `[...nextauth]/route.ts`.

## Database and Prisma

Schema and migrations are located in the `prisma/` directory. Typical workflow:

```bash
npx prisma migrate dev --name descriptive_change_name
npx prisma generate
npx prisma db seed
```

Inspect the current schema in `prisma/schema.prisma` and the migration SQL files in `prisma/migrations/`.

## Testing & Linting

- ESLint is configured in `eslint.config.mjs`. Run `npm run lint` if available.
- Add tests and CI configuration as needed.

## Deployment

This app is ready to deploy to Vercel, Render, or any platform that supports Next.js + Node. Ensure the production database `DATABASE_URL` and `NEXTAUTH_SECRET` are set in the environment.

Recommended Vercel settings:

- Build command: `npm run build`
- Output directory: (Next.js default)

## Contributing

- Open an issue for bugs or feature requests.
- Create a branch named `feat/your-feature` or `fix/your-fix` and submit a pull request against `dev` or `main` depending on workflow.

Please run linters and formatters before opening PRs.

## Troubleshooting

- If Prisma complains about migration history, check `prisma/migrations` and ensure the `DATABASE_URL` points to the expected database.
- For auth issues, verify `NEXTAUTH_URL` and provider credentials.

## Maintainers & Contact

Maintained by the repository owner. For questions or access, open an issue or contact the maintainer via the repository.

## License

See the `LICENSE` file if present. If no license is included this repository is not publicly licensed — contact the maintainer for terms.
