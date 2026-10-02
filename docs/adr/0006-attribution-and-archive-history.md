---
status: accepted
date: 2026-10-01
amended: 2026-10-02
---

# Attribution and archive history

What the clinic can be told about who did what, and what it cannot yet be told. #30 asked for the attribution requirement to be specified beyond the existing optional actor fields; this records the requirement, the gap, and the shape the gap is closed in. The requirement was decided here first and the schema migration landed separately (#32); the Implementation section below records what that migration actually built. Questions 1 to 3 are answered. Question 4 is not, and is left open on purpose.

## Requirement

For a clinical record, the clinic must be able to answer four questions without guessing:

1. **Who made this change?** Every create, edit, archive, and restore of a patient, appointment, visit, vitals record, or order carries the account that performed it. In the target state the actor is not optional on a clinical record: a row whose actor is unknown cannot be defended, audited, or corrected. The two columns the schema lacks for this are named in the gaps below.
2. **When did it happen, and in what order?** `updatedAt` answers when the row last changed, which is not the same question once a record is edited twice in the same second or restored after archiving. A change has its own instant.
3. **What happened to this record over its life?** Archive and restore are lifecycle events, not merely a nullable timestamp. A record that is archived and later restored has two events, not a `deletedAt` that is now null.
4. **Can an edit be told apart from a correction?** Nothing in the schema records that a value was replaced rather than set, so an edit that silently overwrites a reading leaves no trace.

## What the schema did when this was decided

Attribution exists where the model already had a column for it:

| Record                                        | Actor column                                                    | Recorded today                            |
| --------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------- |
| `Visit`                                       | `createdById`, `updatedById`                                    | create, edit, checkout, archive           |
| `Vitals`                                      | `recordedById`                                                  | record                                    |
| `LabOrder`, `ImagingOrder`, `MedicationOrder` | `orderedById`                                                   | request                                   |
| `Appointment`                                 | `providerId` (who it is with), `createdById` written to `Visit` | check-in writes the visit's `createdById` |
| `Patient`                                     | none                                                            | —                                         |
| archive / restore                             | none on any model                                               | —                                         |

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

The migration that came after this decision adds an append-only archive/restore event rather than widening `deletedAt`: an event row per archive and per restore, carrying the record, the actor, and the instant. That is the smallest shape that answers questions 2 and 3, and it is append-only because a history that can be edited is not a history. It also adds the `Patient` and `Appointment` actor columns that question 1 asks for. What it built, and what it left out, is recorded under Implementation.

Nothing here promises immutability of clinical values; question 4 is recorded as a requirement the current schema cannot meet, and no command claims to.

## Implementation

The migration `202510021654_add_attribution_and_archive_events` closed the three gaps named above:

- `Patient` and `Appointment` each gained `createdById` and `updatedById`. Every create, edit, archive, and restore fills the column it owns; restore also rewrites `updatedById`, so the last actor stays visible on the row itself. The columns are nullable so a row written before the migration keeps its history — that is the only reason they may be null, and it is why `Visit.updatedById` is nullable on the same terms. Two columns cannot hold four actors, so a record archived and restored reports its restorer rather than its last editor; the editor survives in the log, which is the reason the log exists.
- `ArchiveRestoreEvent` is the log: one row per archive, one per restore, naming `recordType`, `recordId`, `actorId`, and `occurredAt`. `recordType` is an enum rather than free text, because a log is only readable if every archive of a record lands under one name: a typo stored as text would silently split a record's history in two. It covers every command that archives or restores — patients, appointments, visits, vitals, and the three kinds of order — not only the two models this ADR opened with, because a log that recorded some archives and not others would be worse than none.
- Append-only is enforced in the database, by triggers that refuse `UPDATE`, `DELETE`, and `TRUNCATE` on the log. Enforcing it in the application alone would have left the log editable by any caller holding a Prisma client, which is exactly the caller most likely to want to correct it. Separately, the actor relation is `ON DELETE RESTRICT` so an account cannot be deleted out from under the history that names it — that is Prisma's default for a required relation, not something the trigger adds.

The `deletedAt` change and its event row are written in one transaction, so a record is never archived without the history admitting it. Every archive is idempotent and writes no event for a retry, so the log holds one row per change rather than one row per attempt.

Patient and appointment reads expose their events in the order they happened, which is what makes the log worth keeping. [ADR 0002](0002-archive-deleted-clinical-records.md) says there is no read of archived records yet and no list to restore from; that is still true of the screens, but it is no longer true of the reads — a record's history can now be asked for, and only browsing it across every record type is left to #33.

**Question 4 is deliberately still open.** Nothing here distinguishes a value that was edited from a value that was corrected, and no command claims to: `updatePatient` and `restorePatient` look alike in the log. Closing it means recording values before they are replaced, which is a different and larger decision than this one, and it is tracked rather than quietly assumed.

## Consequence

Before the migration, the clinic could name who recorded a reading, who opened a visit, and who last changed a visit. It could not name who registered a patient, who booked an appointment, or who archived either — and it could not see that a restore ever happened. Those gaps are now closed for every record that has been archived or restored since, and remain closed forward for creates and edits. What the clinic still cannot be told is whether an edit was a correction, which is question 4 above.

Storing an event row for archive and restore means an archive is a write to two tables rather than one. That cost is the reason the migration is separate from the decision to archive at all, which [ADR 0002](0002-archive-deleted-clinical-records.md) already settled.
