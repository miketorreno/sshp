---
status: accepted
date: 2026-09-25
amended: 2026-10-01
---

# Authenticated read routes and write actions

The app will use authenticated GET route handlers for browser reads and authenticated domain server actions for writes, with Better Auth's catch-all as the only REST exception. This gives each mutation one validation, authorization, revalidation, and cache-invalidation path while retaining a simple read seam for the calendar, combobox, and React Query pages.

> Amended 2026-09-26 by the order slice: `/api/medications` and `medications:list` are added, because a medication request names a medication from the pharmacy's catalogue. The catalogue is read-only from the browser, so it adds a read and no write method.
>
> Amended 2026-09-26 by ADR-0004: the time-zone rule this document deferred to #28 is now settled in ADR-0004. The `visits:list` date window is a window in the clinic's zone, not in the server's, and the appointment list read takes an optional window and search that the calendar and the table use respectively.
>
> Amended 2026-09-26 at the end of the migration: the deferred-scope table below records which backlog issue owns each behaviour this decision left alone, and the pre-migration ambient domain interfaces are deleted.
>
> Amended 2026-10-01 by #29: the patient search this document gave its own key and `?query=` parameter is gone. Search is a filter on the patient list read (`?search=`), the patient list answers with a total count, and `/api/patients/reports` is added as a read. The combobox is the first consumer of the filtered list, and patient writes revalidate both the list and report pages.
>
> Amended 2026-10-01 by #30: session presence is no longer the only authorization rule. Every domain read and every write command requires a named permission enforced at this boundary, per [ADR 0005](0005-role-permissions-at-the-read-and-write-boundary.md). The `delete*` command and action names below are `archive*`, because they archive; see [ADR 0002](0002-archive-deleted-clinical-records.md). The role-aware interface is still deferred.
>
> Amended 2026-09-26 by ADR-0003: the `/api/auth/[...all]` handler below is no longer unchanged — it now builds the auth system on first request rather than at import, which is the only way to keep it out of the build. Its path, methods, and public/unauthenticated split are unchanged. ADR-0003 also carves an exception out of the test seams below: proving a module builds nothing while being imported means mocking the client, so `src/lib/prisma.test.ts` and `src/lib/auth.test.ts` stand in for Prisma and Better Auth.

## Boundaries

- `/api/*` is an internal browser contract, not a public API; existing paths remain and no versioned API is introduced.
- Every domain GET, and every domain action other than the public sign-up and sign-in, requires `auth.api.getSession`. The app layout is not the boundary. The Better Auth `nextCookies()` plug remains the cookie session adapter, so the existing session cookies keep working inside actions and route handlers.
- Better Auth's `/api/auth/[...all]` handler keeps its path, methods, and public sign-up/sign-in split. As of ADR-0003 it builds the auth system on first request rather than at import. Sign-up and sign-in stay public; sign-out requires a session and redirects on success.
- Role permissions are required at this boundary as of [ADR 0005](0005-role-permissions-at-the-read-and-write-boundary.md): a read route answers `403` and a command returns the `FORBIDDEN` failure. The role-aware interface — hiding navigation and controls a role cannot use — is still deferred; the boundary is the control either way.
- Session user IDs populate existing `createdById`, `updatedById`, `recordedById`, and `orderedById` fields where the model supports them. What the schema cannot yet record — who registered a patient, who booked an appointment, who archived or restored anything — is specified in [ADR 0006](0006-attribution-and-archive-history.md).

## Action surface

Retain and reshape the current action modules, and add domain modules for the writes that currently live only in route handlers:

| Module                                   | Commands                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `src/app/actions/auth-actions.ts`        | `signUp`, `signIn`, session-aware `signOut`                                                                   |
| `src/app/actions/patient-actions.ts`     | `createPatient`, `updatePatient`, `archivePatient`; remove the unused `getPatient` read |
| `src/app/actions/visit-actions.ts`       | `createVisit` (including check-in), `updateVisit`, `checkoutVisit`, `archiveVisit`                            |
| `src/app/actions/appointment-actions.ts` | `createAppointment`, `updateAppointment`, `archiveAppointment`, `checkInAppointment`                          |
| `src/app/actions/vitals-actions.ts`      | `addVitals`, `archiveVitals`                                                                                   |
| `src/app/actions/order-actions.ts`       | request and archive commands for lab, imaging, and medication orders                                          |

Every command validates its input, treats the resource path ID as authoritative, verifies nested-resource ownership, rejects clinical writes to a visit or its children after checkout, populates supported actor fields, and returns a discriminated success/error result. Form commands may redirect on success; redirects must not be caught as ordinary failures. Failures use stable codes/messages and never expose raw database errors.

Each write calls `revalidatePath` for any affected server-rendered path; that is a narrow revalidation path for server components and layouts, not a second data source. Successful client-side command calls invalidate only the affected React Query keys.

## Surviving reads

| Endpoint                 | Target                                                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/appointments`      | Authenticated appointment list DTO; `POST` is removed                                                                                                                       |
| `/api/appointments/[id]` | Authenticated appointment detail DTO; `PUT` and `DELETE` are removed                                                                                                        |
| `/api/patients`          | Authenticated patient list DTO with page/limit parameters and a `search` filter; `POST` is removed                                                                             |
| `/api/patients/[id]`     | Authenticated patient detail DTO; `PUT` and `DELETE` are removed                                                                                                            |
| `/api/patients/admitted` | Authenticated, patient-centric admitted-patient DTO                                                                                                                         |
| `/api/patients/reports`  | Authenticated patient report DTO for a reporting period; added by #29                                                                                                       |
| `/api/visits`            | Canonical authenticated visit-list DTO with a date-window and visit-type filter; consumed by Today's Outpatients; includes the patient and provider fields the page renders |
| `/api/visits/[id]`       | Authenticated visit-detail DTO; `PUT` and `DELETE` are removed                                                                                                              |
| `/api/medications`       | Authenticated active medication catalogue DTO, consumed by the medication request form; added by the order slice                                                            |
| `/api/auth/[...all]`     | Better Auth exception, unchanged                                                                                                                                            |

`/api/patients/outpatients` is removed after Today's Outpatients switches to `/api/visits`. The admitted endpoint returns patients, not fabricated visit rows; the page must use patient IDs and patient-detail links. The visit-list filter is a contract for the date window and visit type; the repository-wide time-zone rule this deferred is settled in ADR-0004.

Route reads return typed, browser-facing DTOs rather than raw Prisma shapes. The ambient domain interfaces inherited from the pre-migration codebase are deleted, including the fabricated `PatientVisit` row, which declared the orders, vitals, notes, diagnoses, and procedures that the outpatients endpoint never included; a browser-visible model is a DTO in the owning domain's `dto.ts` or a generated Prisma type. The central fetch client checks `response.ok`, maps 401/404/409/500 failures consistently, and uses a typed query-key registry:

- `patients:list(filters)`, `patients:detail(id)`, `patients:admitted`, `patients:report(period)`
- `appointments:list`, `appointments:detail(id)`
- `visits:list(filters)`, `visits:detail(id)`
- `medications:list`

Patient search is a filter on `patients:list(filters)` rather than a key of its own: a search result is a page of the list, so the term rides in the list key and the two cannot disagree about which patient a page holds. The patient list read answers with `rows`, `page`, `pageSize`, and `totalCount`, because a pager needs to know how many rows there are as well as which rows it has; other list reads keep whatever envelope they already had, and a pager given no total count falls back to inferring a next page from a full one. `medications:list` is served by `GET /api/medications` and is not invalidated by order writes, because an order changes a visit rather than the catalogue.

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

| Deferred                                                                                                                                                                                                                                                                                                                                                                                                                     | Backlog        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| ~~Calendar drag/resize, file and attachment workflows, date and time-zone handling, measurement units, and the appointment check-in link direction in the schema~~ — decided in [ADR 0004](0004-clinic-time-zone-and-read-only-calendar.md): the calendar reads only, attachments stay unsupported, the clinic zone owns every wall clock, units are one catalogue, and `Visit.appointmentId` is the canonical check-in link | #28 (resolved) |
| ~~Patient discovery and reporting redesigns~~ — decided by #29: one patient list read carrying a search filter and a total count, and a real report read behind `/api/patients/reports`. Archived patients are excluded from the list, the search, and every clinical figure on the report, per [ADR 0002](0002-archive-deleted-clinical-records.md); the report's one archive panel counts archival events inside the period rather than reading archived clinical data | #29 (resolved) |
| ~~Role permissions, audit, restore/undelete, and the `Delete` label terminology~~ — decided by #30: the permission matrix at the read and write boundary in [ADR 0005](0005-role-permissions-at-the-read-and-write-boundary.md), the restore lifecycle and the “Archive” label in [ADR 0002](0002-archive-deleted-clinical-records.md), and the attribution requirement plus its gaps in [ADR 0006](0006-attribution-and-archive-history.md). Two follow-ups remain: the archive history migration, and the interface that makes a role's capabilities and the archive visible | #30 (resolved) |

## Test seams

The first implementation ticket introduces Vitest. Tests observe public seams: the session guard, action results, GET DTOs/statuses, the shared fetch client, and resource/state invariants. Tests do not reach into Prisma or component internals.
