---
status: accepted
date: 2026-09-25
amended: 2026-09-26
---

# Authenticated read routes and write actions

The app will use authenticated GET route handlers for browser reads and authenticated domain server actions for writes, with Better Auth's catch-all as the only REST exception. This gives each mutation one validation, authorization, revalidation, and cache-invalidation path while retaining a simple read seam for the calendar, combobox, and React Query pages.

> Amended 2026-09-26 by the order slice: `/api/medications` and `medications:list` are added, because a medication request names a medication from the pharmacy's catalogue. The catalogue is read-only from the browser, so it adds a read and no write method.
>
> Amended 2026-09-26 at the end of the migration: the deferred-scope table below records which backlog issue owns each behaviour this decision left alone, and the pre-migration ambient domain interfaces are deleted.

## Boundaries

- `/api/*` is an internal browser contract, not a public API; existing paths remain and no versioned API is introduced.
- Every domain GET, and every domain action other than the public sign-up and sign-in, requires `auth.api.getSession`. The app layout is not the boundary. The Better Auth `nextCookies()` plug remains the cookie session adapter, so the existing session cookies keep working inside actions and route handlers.
- Better Auth's `/api/auth/[...all]` handler remains unchanged. Sign-up and sign-in stay public; sign-out requires a session and redirects on success.
- Role permissions and a role matrix are deferred (#30). Session presence is the only authorization rule in this migration; the existing role-aware UI is unchanged.
- Session user IDs populate existing `createdById`, `recordedById`, and `orderedById` fields where the model supports them.

## Action surface

Retain and reshape the current action modules, and add domain modules for the writes that currently live only in route handlers:

| Module | Commands |
| --- | --- |
| `src/app/actions/auth-actions.ts` | `signUp`, `signIn`, session-aware `signOut` |
| `src/app/actions/patient-actions.ts` | `createPatient`, `updatePatient`, `deletePatient` (archives the patient); remove the unused `getPatient` read |
| `src/app/actions/visit-actions.ts` | `createVisit` (including check-in), `updateVisit`, `checkoutVisit`, `deleteVisit` |
| `src/app/actions/appointment-actions.ts` | `createAppointment`, `updateAppointment`, `deleteAppointment`, `checkInAppointment` |
| `src/app/actions/vitals-actions.ts` | `addVitals`, `deleteVitals` |
| `src/app/actions/order-actions.ts` | create and delete commands for lab, imaging, and medication orders |

Every command validates its input, treats the resource path ID as authoritative, verifies nested-resource ownership, rejects clinical writes to a visit or its children after checkout, populates supported actor fields, and returns a discriminated success/error result. Form commands may redirect on success; redirects must not be caught as ordinary failures. Failures use stable codes/messages and never expose raw database errors.

Each write calls `revalidatePath` for any affected server-rendered path; that is a narrow revalidation path for server components and layouts, not a second data source. Successful client-side command calls invalidate only the affected React Query keys.

## Surviving reads

| Endpoint | Target |
| --- | --- |
| `/api/appointments` | Authenticated appointment list DTO; `POST` is removed |
| `/api/appointments/[id]` | Authenticated appointment detail DTO; `PUT` and `DELETE` are removed |
| `/api/patients` | Authenticated patient list DTO with existing page/limit parameters; `POST` is removed; the same GET accepts `query` for patient search |
| `/api/patients/[id]` | Authenticated patient detail DTO; `PUT` and `DELETE` are removed |
| `/api/patients/admitted` | Authenticated, patient-centric admitted-patient DTO |
| `/api/visits` | Canonical authenticated visit-list DTO with a date-window and visit-type filter; consumed by Today's Outpatients; includes the patient and provider fields the page renders |
| `/api/visits/[id]` | Authenticated visit-detail DTO; `PUT` and `DELETE` are removed |
| `/api/medications` | Authenticated active medication catalogue DTO, consumed by the medication request form; added by the order slice |
| `/api/auth/[...all]` | Better Auth exception, unchanged |

`/api/patients/outpatients` is removed after Today's Outpatients switches to `/api/visits`. The admitted endpoint returns patients, not fabricated visit rows; the page must use patient IDs and patient-detail links. The visit-list filter is a contract for the date window and visit type; the repository-wide time-zone rule is deferred to #28, not settled by this migration.

Route reads return typed, browser-facing DTOs rather than raw Prisma shapes. The ambient domain interfaces inherited from the pre-migration codebase are deleted, including the fabricated `PatientVisit` row, which declared the orders, vitals, notes, diagnoses, and procedures that the outpatients endpoint never included; a browser-visible model is a DTO in the owning domain's `dto.ts` or a generated Prisma type. The central fetch client checks `response.ok`, maps 401/404/409/500 failures consistently, and uses a typed query-key registry:

- `patients:list(filters)`, `patients:detail(id)`, `patients:admitted`, `patients:search(query)`
- `appointments:list`, `appointments:detail(id)`
- `visits:list(filters)`, `visits:detail(id)`
- `medications:list`

`patients:search(query)` is served by `GET /api/patients?query=...`; the patient combobox is its first consumer. `medications:list` is served by `GET /api/medications` and is not invalidated by order writes, because an order changes a visit rather than the catalogue.

Query keys include every filter that changes the result. The registry records the exact keys each write invalidates. Because list filters make keys distinct, a write invalidates the affected list prefix (for example every `patients:list(filters)` key) unless the change narrows to one key.

## Client migration

All domain reads move to the shared React Query client, including the FullCalendar component and patient combobox. Manual `useEffect` fetches are removed. Forms call server actions directly, show the action result, and invalidate the affected query keys. The following page groups migrate by domain:

- Patients: list, detail, edit, admitted, outpatients, and the patient combobox.
- Appointments: calendar, list, add, detail, edit, and check-in entry points.
- Visits: check-in, detail, edit, checkout, and vitals.
- Orders: lab, imaging, and medication request pages and the visit order tables.

## Cutover order

1. Patients plus shared test/auth/result/DTO/query infrastructure.
2. Appointments and check-in.
3. Visits and vitals.
4. Lab, imaging, and medication orders.
5. Auth integration and the final transport cleanup.

Each domain slice switches its consumers and removes its obsolete write methods in the same change. There is no compatibility layer that keeps two authorities for one mutation.

## Deferred scope

Behaviour this migration deliberately leaves alone, and the backlog issue that now owns it. A follow-up change that touches one of these should start from that issue, not from this ADR.

| Deferred | Backlog |
| --- | --- |
| Calendar drag/resize, file and attachment workflows, date and time-zone handling, measurement units, and the appointment check-in link direction in the schema | #28 |
| Patient discovery and reporting redesigns | #29 |
| Role permissions, audit, restore/undelete, and the `Delete` label terminology | #30 |

## Test seams

The first implementation ticket introduces Vitest. Tests observe public seams: the session guard, action results, GET DTOs/statuses, the shared fetch client, and resource/state invariants. Tests do not reach into Prisma or component internals.
