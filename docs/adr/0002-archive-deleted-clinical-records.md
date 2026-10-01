---
status: accepted
date: 2026-09-25
amended: 2026-10-01
---

# Archive deleted clinical records

Existing delete operations will archive records by setting their existing `deletedAt` field rather than destroying rows. Archiving preserves history: the command means that a record leaves normal clinical views and remains retained.

> Amended 2026-10-01 by #30: the label is **Archive** everywhere a person reads or writes one, the `delete*` command and action names are `archive*`, restore is a command of its own, and roles hold the permissions this document left to the boundary. The deferrals this document named are settled by [ADR 0005](0005-role-permissions-at-the-read-and-write-boundary.md) and by the restore rules below; attribution is [ADR 0006](0006-attribution-and-archive-history.md).

## Rules

- Applies to the currently exposed patient, visit, appointment, vitals, lab-order, imaging-order, and medication-order archives.
- Only the explicitly targeted record is archived. Dependent records are retained and become inactive through their archived parent: a patient's visits and appointments disappear with the patient, and a visit's orders and vitals disappear with the visit.
- Normal reads filter out archived records everywhere: lists, detail reads, search, calendar data, and nested visit detail data. A read that would cross an archived parent returns no active child.
- A command targeting an archived record is idempotent; a normal detail read of one behaves as not found.
- Clinical writes and archival of a visit or its children are rejected after checkout, following the checkout rule in ADR 0001.
- Patient email and patient code remain unique after archival. An archived identity is not reused, so restoring a patient never has to check that its email or code are free.
- Lab, imaging, and medication “Archive” archives the order. It does not translate the order into `CANCELLED`.
- Role permissions are enforced at the boundary; see [ADR 0005](0005-role-permissions-at-the-read-and-write-boundary.md).

## Terminology

A person reads and writes “Archive”, never “Delete”. The buttons, the confirmation prompts, the toasts, the domain commands, and the server actions all say **archive**, because the lifecycle is a decision the reader is making — keep it, take it out of the way — and “Delete” promises a destruction that does not happen. `deletedAt` keeps its name: it is the column, and the schema is not the vocabulary.

## Restore

Restoring is a command of its own rather than the absence of a delete, and it answers these questions:

- **Who may restore?** Only `ADMIN` and `SUPERUSER`, which is the `*:restore` permission in [ADR 0005](0005-role-permissions-at-the-read-and-write-boundary.md). Archiving a record and bringing it back are both statements about the clinic's own history, so neither is delegated to a treating role.
- **What does it do?** It clears `deletedAt` and nothing else. A restored patient returns to the panel, the list, the search, and the report's figures; a restored appointment returns to the calendar and the list; a restored visit, reading, or order returns to the reads that had stopped showing it.
- **Is it idempotent?** Yes. Restoring an already active record is the outcome the caller wanted, not a failure, and it answers with `restoredAt: null` because there was no archive left to reverse. A retried restore reports the same thing the first one did.
- **What if the record above it is archived?** The restore is refused with the same NOT_FOUND the archive reported. A visit under an archived patient, or a reading or order under an archived visit, is not restorable until what holds it up is restored first, so an archive unwinds from the top down rather than all at once.
- **What does a restore not undo?** It does not undo a checkout or a check-in. The end of a visit and the fact a patient arrived are recorded once and are not consequences of an archive; a restored visit reads as the closed visit it was, and a restored appointment keeps the check-in that keeps the unique index on `Visit.appointmentId` occupied.
- **What do the reads expose?** Nothing new. Normal clinical reads keep hiding archived records before and after a restore, so a restore does not widen what any read shows. There is no read of archived records yet: browsing the archive is a screen, and the screen is a follow-up, not a hole in the policy.

Restoring has no interface yet — there is no list of archived records to restore from. The commands are the decision; the screen that makes them reachable is named as a follow-up in ADR 0001.

The existing schema already provides `deletedAt` on the affected domain models, so this decision does not require a field-adding migration. Read filters and relationship-aware lookups still need to be applied consistently. A child cannot be treated as active merely because its own row is active if any ancestor record is archived.

## Consequence

Archiving a patient or visit no longer breaks dependent clinical history or foreign keys, and an archive is now reversible by a named role rather than permanent by default.

The `delete*` names are gone from the domain and the actions: they described a destruction the code does not perform. What remains is `deletedAt`, the column, and the test doubles' `destroyed` list, which records the rows a command did *not* destroy. See `CONTEXT.md` for the active, inactive, archived, and restored vocabulary.
