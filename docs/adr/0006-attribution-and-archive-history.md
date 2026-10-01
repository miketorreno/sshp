---
status: accepted
date: 2026-10-01
---

# Attribution and archive history

What the clinic can be told about who did what, and what it cannot yet be told. #30 asked for the attribution requirement to be specified beyond the existing optional actor fields; this records the requirement, the gap, and the shape the gap is closed in. It does not close it, because closing it is a schema migration and a migration is not part of this change.

## Requirement

For a clinical record, the clinic must be able to answer four questions without guessing:

1. **Who made this change?** Every create, edit, archive, and restore of a patient, appointment, visit, vitals record, or order carries the account that performed it. An actor is not optional on a clinical record: a row whose actor is unknown cannot be defended, audited, or corrected.
2. **When did it happen, and in what order?** `updatedAt` answers when the row last changed, which is not the same question once a record is edited twice in the same second or restored after archiving. A change has its own instant.
3. **What happened to this record over its life?** Archive and restore are lifecycle events, not merely a nullable timestamp. A record that is archived and later restored has two events, not a `deletedAt` that is now null.
4. **Can an edit be told apart from a correction?** Nothing in the schema records that a value was replaced rather than set, so an edit that silently overwrites a reading leaves no trace.

## What the schema does today

Attribution exists where the model already had a column for it:

| Record                | Actor column                                              | Recorded today                              |
| --------------------- | -------------------------------------------------------- | ------------------------------------------- |
| `Visit`               | `createdById`, `updatedById`                              | create, edit, checkout, archive             |
| `Vitals`              | `recordedById`                                            | record                                      |
| `LabOrder`, `ImagingOrder`, `MedicationOrder` | `orderedById`                  | request                                     |
| `Appointment`         | `providerId` (who it is with), `createdById` written to `Visit` | check-in writes the visit's `createdById` |
| `Patient`             | none                                                      | —                                           |
| archive / restore     | none on any model                                         | —                                           |

Three gaps follow from that table, and they are the whole of what is missing:

- **`Patient` has no actor column.** Registering or archiving a patient is unattributed.
- **`Appointment` has no actor column.** `providerId` is who the appointment is with, not who booked it, and it can be null.
- **No model records who archived or restored it, or when, apart from `deletedAt`.** `Visit.updatedById` records who last touched a visit, which after a restore is the restoring clinician — so the last actor is visible and the event is not. An archive and its restore leave one column and one timestamp, and a record archived twice over its life leaves no way to know it happened twice.

## Decision

Specify the requirement now; migrate when the schema can be changed deliberately. Concretely, this change:

- populates the actor columns the schema already has, from the permission-holding session, for every create, edit, checkout, and archive it performs;
- performs restores through `Visit.updatedById` and otherwise leaves attribution to the migration, rather than writing a column that means something different for each model;
- makes `role` and `isActive` the session facts that decide who may act at all ([ADR 0005](0005-role-permissions-at-the-read-and-write-boundary.md));
- treats "an actor is unknown" as a reason the field is nullable and not populated, never as permission to skip the actor: a command that cannot name its actor does not write.

The migration, when it comes, adds an append-only archive/restore event rather than widening `deletedAt`: an event row per archive and per restore, carrying the record, the actor, and the instant. That is the smallest shape that answers questions 2 and 3, and it is append-only because a history that can be edited is not a history. It also adds the `Patient` and `Appointment` actor columns that question 1 asks for.

Nothing here promises immutability of clinical values; question 4 is recorded as a requirement the current schema cannot meet, and no command claims to.

## Consequence

Today the clinic can name who recorded a reading, who opened a visit, and who last changed a visit. It cannot name who registered a patient, who booked an appointment, or who archived either — and it cannot see that a restore ever happened. Those are known, bounded gaps rather than surprises, tracked as the follow-up issue named in ADR 0002, not as something a reader of the code has to discover.

Storing an event row for archive and restore means an archive is a write to two tables rather than one. That cost is the reason the migration is separate from the decision to archive at all, which [ADR 0002](0002-archive-deleted-clinical-records.md) already settled.