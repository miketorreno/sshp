---
status: accepted
date: 2026-10-01
---

# Role permissions at the read and write boundary

Every domain read and every write command will require a named permission before it reaches the database, and the permission matrix will live in one place: `src/server/access.ts`. Session presence is no longer the only authorization rule, which is what ADR 0001 and ADR 0002 deferred to #30.

## Why the boundary, not the screen

A permission enforced by the interface is a permission a caller without the interface does not have. The reads under `/api/*` and the server actions are the doors every caller comes through, so that is where the answer lives: hiding a button is a courtesy to a reader who cannot use it, not a control.

## Naming

Permissions name capabilities (`patients:write`), not roles. A read or a write asks for the capability its change needs, and the matrix maps roles onto capabilities. Adding a role is a row in the matrix; adding a capability is a name in the one list. Nothing anywhere else asks "what kind of user is this?".

## Matrix

| Permission                 | ADMIN | SUPERUSER | DOCTOR | NURSE | RECEPTIONIST | LAB / IMAGING TECH | PHARMACIST | PATIENT | USER |
| -------------------------- | ----- | --------- | ------ | ----- | ------------ | ------------------ | ---------- | ------- | ---- |
| `patients:read`            | ✓     | ✓         | ✓      | ✓     | ✓            | ✓                  | ✓          |         | ✓    |
| `patients:write`           | ✓     | ✓         | ✓      |       | ✓            |                    |            |         |      |
| `patients:archive`         | ✓     | ✓         | ✓      |       | ✓            |                    |            |         |      |
| `patients:restore`         | ✓     | ✓         |        |       |              |                    |            |         |      |
| `appointments:read`        | ✓     | ✓         | ✓      | ✓     | ✓            |                    |            |         | ✓    |
| `appointments:write`       | ✓     | ✓         | ✓      | ✓     | ✓            |                    |            |         |      |
| `appointments:archive`     | ✓     | ✓         | ✓      | ✓     | ✓            |                    |            |         |      |
| `appointments:checkIn`     | ✓     | ✓         | ✓      | ✓     | ✓            |                    |            |         |      |
| `appointments:restore`     | ✓     | ✓         |        |       |              |                    |            |         |      |
| `visits:read`              | ✓     | ✓         | ✓      | ✓     | ✓            | ✓                  | ✓          |         |      |
| `visits:write`             | ✓     | ✓         | ✓      | ✓     |              |                    |            |         |      |
| `visits:archive`           | ✓     | ✓         | ✓      | ✓     |              |                    |            |         |      |
| `visits:restore`           | ✓     | ✓         |        |       |              |                    |            |         |      |
| `vitals:write`             | ✓     | ✓         | ✓      | ✓     |              |                    |            |         |      |
| `vitals:archive`           | ✓     | ✓         | ✓      | ✓     |              |                    |            |         |      |
| `vitals:restore`           | ✓     | ✓         |        |       |              |                    |            |         |      |
| `orders:write`             | ✓     | ✓         | ✓      |       |              |                    |            |         |      |
| `orders:archive`           | ✓     | ✓         | ✓      |       |              |                    |            |         |      |
| `orders:restore`           | ✓     | ✓         |        |       |              |                    |            |         |      |
| `medications:read`         | ✓     | ✓         | ✓      | ✓     |              |                    | ✓          |         |      |
| `reports:read`             | ✓     | ✓         | ✓      | ✓     | ✓            |                    |            |         |      |

The judgement calls the table records:

- **Only an administrator restores.** Archiving is a decision about a record's place in the clinic; reversing one is a decision about the clinic's own history, so `*:restore` is held by `ADMIN` and `SUPERUSER` alone. A role that may archive a record is not thereby trusted to bring one back.
- **Restore is separate from archive rather than the absence of it.** "Delete" could mean "remove" or "bring back"; two permissions say which.
- **The clinical record reads as a whole or not at all.** A role that reads patients, visits, orders, medications, and reports reads all of them, because a clinician shown a visit but not the patient it belongs to has been shown half a story.
- **The front desk runs registration and the appointment desk.** `RECEPTIONIST` reads and writes patients and appointments and checks a patient in from an appointment, which ends in the visit that check-in opens, so it reads visits too. Opening a visit is a clinical act, so the walk-in check-in page is not theirs.
- **Orders are not a read of their own.** They are read as part of the visit they belong to, so a role that may read a visit may read its orders, and there is no `orders:read` for a matrix to grant.
- **Technicians and the pharmacist read the work their department is handed** and write nothing yet. The commands that would let them write — results, completions, administrations — do not exist, so nothing is reserved for them; when those commands arrive they ask for the permission they need, and the matrix is where the answer is decided.
- **`PATIENT` holds nothing.** There is no patient-facing surface in this app; the day there is one it is a screen with its own permissions, not a widened grant on the staff matrix.
- **`USER` is what a new account gets**: a patient lookup and today's expected list, and no writes. A clinical role is what turns an account into a clinician's.

## Refusal

The question "what role is this?" arrives from the session, so two answers are always "no":

- A role the matrix does not name holds nothing. An account row naming a value the app does not know is refused rather than looked up.
- A deactivated account holds nothing, whatever role it kept. `User.isActive` is how a leaver is stopped, so it stops every permission at once rather than leaving the ones that happen to be listed.

Reads report a refusal the way a route reports anything else: `FORBIDDEN` maps to `403` in the shared failure envelope (ADR 0001). Commands report the same failure as a result rather than a throw, because a form is given a result to show.

`role` and `isActive` are Better Auth user `additionalFields`, so the session carries them. They are `input: false`: a client cannot grant itself a role by signing up. A role is assigned by someone who administers staff, which is not a client-supplied field.

## Consequence

The role-aware interface is still deferred: navigation and buttons are not yet hidden per role, so a reader may see a control their role cannot use and be refused by the boundary behind it. The matrix, not the screen, is the control, and hiding the screen is the follow-up that makes the refusal unnecessary to reach.

Attribution — which actor performed an archive or a restore, and the history of either — is not decided here. It is [ADR 0006](0006-attribution-and-archive-history.md).