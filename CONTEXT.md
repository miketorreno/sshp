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
A record retained for history but excluded from normal clinical reads.
_Avoid_: Deleted, removed, hidden row

**Inactive record**:
A record that is not itself archived but is excluded from normal clinical reads because an ancestor record is archived.
_Avoid_: Archived, deleted

**Read model**:
A stable shape of a patient, visit, appointment, or order that staff-facing screens consume.
_Avoid_: API object, JSON payload

**Write command**:
An authenticated instruction to create or change a clinical record.
_Avoid_: Mutation, POST request
