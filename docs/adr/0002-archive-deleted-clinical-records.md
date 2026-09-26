---
status: accepted
date: 2026-09-25
---

# Archive deleted clinical records

Existing delete operations will archive records by setting their existing `deletedAt` field rather than destroying rows. Archiving preserves history and makes the current “Delete” UI label safe: the label stays for now, but the command means that a record leaves normal clinical views and remains retained.

## Rules

- Applies to the currently exposed patient, visit, appointment, vitals, lab-order, imaging-order, and medication-order deletes.
- Only the explicitly targeted record is archived. Dependent records are retained and become inactive through their archived parent: a patient's visits and appointments disappear with the patient, and a visit's orders and vitals disappear with the visit.
- Normal reads filter out archived records everywhere: lists, detail reads, search, calendar data, and nested visit detail data. A read that would cross an archived parent returns no active child.
- A command targeting an archived record is idempotent; a normal detail read of one behaves as not found.
- Clinical writes and archival of a visit or its children are rejected after checkout, following the checkout rule in ADR 0001. Authenticated actors still have no role-based permission matrix in this migration.
- Patient email and patient code remain unique after archival. An archived identity is not reused; restore is a later capability.
- Lab, imaging, and medication “Delete” archives the order. It does not translate the order into `CANCELLED`.
- Restore/undelete is not part of this migration.

The deferrals named in these rules — role permissions, restore/undelete, and the `Delete` label terminology among them — are recorded once, in the deferred-scope table in ADR 0001, with the backlog issue that owns each.

The existing schema already provides `deletedAt` on the affected domain models, so this decision does not require a field-adding migration. Read filters and relationship-aware lookups still need to be applied consistently. A child cannot be treated as active merely because its own row is active if any ancestor record is archived.

## Consequence

Deleting a patient or visit no longer breaks dependent clinical history or foreign keys. The retained “Delete” label is a legacy name, not a promise of permanent destruction; changing user-facing terminology is deferred to the backlog.

The public action names also remain `delete*` for continuity, while the domain vocabulary uses **archive** to describe the behavior. See `CONTEXT.md` for the active, inactive, and archived vocabulary.
