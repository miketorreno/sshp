# Small Scale Electronic Health Record

The shared clinical workspace for patients, appointments, visits, orders, and observations.

## Language

**Patient**:
A person whose clinical record is managed in the system.
_Avoid_: Client, customer, user

**Appointment**:
A scheduled contact between a patient and the clinic.
_Avoid_: Booking, reservation

**Visit**:
An encounter with a patient, including the care and observations recorded during it.
_Avoid_: Encounter record, case

**Instant**:
A point in time, stored and transported in UTC. It has no zone of its own until something renders it, and rendering it shows the clinic's wall clock.
_Avoid_: Date, timestamp (when a wall clock is meant)

**Wall clock**:
What a clinician typed or reads, such as 09:00 on 2026-03-02. It means nothing on its own: it is resolved against the clinic's time zone. A date-only field such as `dateOfBirth` is a wall clock of whole days.
_Avoid_: Local time, naive datetime

**Clinic day**:
One calendar day where the clinic is. A day window is half-open, so it includes its first moment and excludes the first moment of the next day.
_Avoid_: Server day, UTC day

**Measurement**:
A recorded observation with the unit its name promises, such as weight in kg. Zero is a reading; only a blank means not measured.
_Avoid_: Vital (a vital sign is a kind of measurement; a measurement is not a vital sign)

**Check-in**:
The transition that begins a visit, optionally from an appointment.
_Avoid_: Admission (unless the patient is admitted as an inpatient)

**Checkout**:
The transition that ends a visit and closes it to further clinical writes.
_Avoid_: Discharge, close (for non-clinical state)

**Order**:
A lab, imaging, or medication request belonging to a visit.
_Avoid_: Prescription (unless specifically a medication prescription), item

**Active record**:
A record that is not archived and is available to normal clinical reads. It can still be read-only because its workflow is settled, such as a checked-out visit.
_Avoid_: Live record, current row

**Archived record**:
A record retained for history but excluded from normal clinical reads. Archived patients are not searched, listed, or counted as seen; a search that finds nothing may have missed exactly that. Archiving is what the interface calls it: the person taking a record out of the way keeps it, so nothing here is deleted.
_Avoid_: Deleted, removed, hidden row

**Restored record**:
An archived record brought back by an administrator, which is active again and reads as it did before it was archived. Restoring is its own command, not the absence of an archive, and it clears nothing else: a restored visit keeps the checkout it already had.
_Avoid_: Undelete, undeleted, resurrected

**Archive lifecycle**:
Archive and restore as one decision pair, unwound from the top down. A visit under an archived patient, or a reading under an archived visit, stays archived until what holds it up is restored first, so the archive is never half-reversed.
_Avoid_: Soft delete, cascade restore

**Search term**:
What a reader typed to find a patient. It is a filter on the list read rather than a read of its own, so its results are a page of the list and carry the same total the list reports.
_Avoid_: Query, search endpoint, lookup

**Total count**:
How many rows a list read holds across every page, as distinct from the rows of the page in hand. Paging needs both: the rows to draw and the count to know whether another page exists.
_Avoid_: Row count, result length

**Inactive record**:
A record that is not itself archived but is excluded from normal clinical reads because an ancestor record is archived.
_Avoid_: Archived, deleted

**Reporting period**:
A length of time a report reaches back from now, such as the last thirty days. It is a trailing window rather than a calendar one, and the report names the exact instants it counted.
_Avoid_: Calendar period (a period is not a named calendar unit), date range

**Read model**:
A stable shape of a patient, visit, appointment, or order that staff-facing screens consume.
_Avoid_: API object, JSON payload

**Write command**:
An authenticated instruction to create or change a clinical record.
_Avoid_: Mutation, POST request

**Permission**:
A named capability a read or a write asks for before it reaches the database, such as `patients:write`. Capabilities are named for what they allow, never for the role that holds them, so a read states what it needs and the matrix decides who has it.
_Avoid_: Role check, ACL entry, feature flag

**Role**:
What a person's account is for at the clinic — doctor, nurse, receptionist, administrator — which maps to a set of permissions. A role holds capabilities; it is not itself the permission a command asks for. An account whose role the app does not know, or which is deactivated, holds nothing.
_Avoid_: Permission, access level, job title
