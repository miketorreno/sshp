---
status: accepted
date: 2026-09-26
---

# The clinic's clock, and a calendar that only reads

## Why

The app had no single answer to "what time is it at the clinic". Every screen formatted moments with the browser's or the server's own zone, submitted them with `z.coerce.date()`, and filtered "today" with a `setHours(0, 0, 0, 0)` that meant midnight wherever the code happened to run. Three consequences, all of them visible to a clinician rather than to us:

- **A wall clock was read in the wrong zone.** `datetime-local` sends `2026-03-02T09:00`, a wall clock with no offset. `z.coerce.date()` hands that text to `Date`, which reads a bare date-time as _server-local_. A clinic not in the server's zone stored every visit and appointment shifted by the difference, so the clinician who typed 09:00 read back something else.
- **A day boundary moved.** "Today's outpatients" was the server's midnight-to-midnight, so a clinic east or west of the server lost or repeated visits at the edges of the day.
- **The calendar lied by omission.** It asked for a page of the list — the first N appointments in the clinic, not the days on screen — so a busy month was drawn with a silent hole wherever the page ended. And an appointment had two parents in the schema: the visit that actually holds the link, and an `Appointment.appointmentId` mirror nothing wrote or read, which could disagree with the visit table without anything noticing.

The units were the same class of defect. Vitals were recorded under labels that did not say what they were measured in ("Systolic", "Glucose"), the form offered decimals for columns that could only hold whole numbers, `weight` was an `Int` so a fractional kilogram was rounded away, and the visit table printed values straight into cells, so a recorded `0` and a box nobody filled in looked identical.

## Rules

### Time

- `src/lib/clinic-time.ts` owns every conversion. **An instant is stored and transported in UTC; a wall clock is always the clinic's wall clock.** Nothing else formats, parses or bounds a moment.
- The zone is `CLINIC_TIME_ZONE`, an IANA name read through a function at the moment it is needed — never at module scope, per ADR 0003. It defaults to `UTC`, which is what the container runs in, so an unconfigured deployment is consistent rather than broken. An unusable value raises `InvalidTimeZoneError` naming the variable, instead of failing inside `Intl` with a locale in the message.
- **Every conversion, comparison, and formatting function in `clinic-time.ts` takes the zone as an argument, and none defaults it.** The two exceptions are the server-side runtime accessor `clinicTimeZone()` and `clinicDateTimeSchema`, which takes a thunk so that *parsing* rather than module loading is what reads it. A client component cannot read `process.env`: Next.js strips it from the browser bundle unless a variable is `NEXT_PUBLIC_`-prefixed, and prefixing this one would make the zone a *build* input — which ADR 0003 forbids, and which would bake one clinic's offset into an image another clinic then deploys. A clock that quietly read the environment would therefore answer `UTC` in every browser while the server resolved the real zone: the same record read as two different times, which is the exact failure this ADR exists to prevent, and one that compiles, typechecks, and passes a server-side test suite. So the zone is **passed, not found**, and a missing one is a type error rather than a wrong hour on a chart.
- Server code reads the zone with `clinicTimeZone()`. Client code receives it from the server-rendered tree with `useClinicTimeZone()`; `ClinicTimeZoneProvider` is mounted in the authenticated app layout, so every staff-facing screen is under it.
- A submitted wall clock is resolved against the clinic zone, not by `Date`'s own parser. A wall clock that does not exist in that zone (the hour a spring-forward skips) is rejected rather than silently moved; a wall clock that happens twice (a fall-back hour) resolves to the earlier instant, deterministically.
- A date-only field — `dateOfBirth`, `referredDate` — is a calendar day at the clinic, not an instant. The column is a `DateTime` and stays one, but the day it holds is the moment that day opens in the clinic zone: `2001-06-15` from a `date` input is stored as `2001-06-14T16:00Z` in Manila, not as `2001-06-15T00:00Z`. Storing it as UTC midnight is what makes a birth date read as the day before anywhere west of UTC, and a New Year baby a year younger on their birthday. Every read of one therefore renders the *day it names*, not the instant it holds.
- A day window is half-open: `[startOfDay, startOfNextDay)`. Consecutive windows neither drop a record starting exactly on the boundary nor return one twice.
- Reads render in the clinic zone. A clinician in another zone sees the clinic's wall clock, which is the one the appointment was made against.

### Vitals

- `src/server/visits/vitals-measurements.ts` is one catalogue naming every stored measurement: its column, the label a clinician reads, the unit that label promises, and whether the column holds whole numbers. The recording form and the visit's vitals table both read it, so the unit asked for is the unit shown.
- A measurement of zero is a reading and is printed as one. Only a null reads as nothing; a blank cell means "not measured" and nothing else.
- A column's precision is the limit on what the form offers: whole-number columns take `step="1"`, float columns take `step="any"`. `weight` is a float because 70.5 kg is a real weight.

### Calendar

- **The calendar reads. It does not write.** Drag and resize are not supported, and the interaction plugin that implied they might be is removed. Moving an appointment stays a deliberate act on the appointment itself, where the patient, provider and reason are visible.
- The calendar names the window it is drawing — from FullCalendar's `datesSet` — and the read answers that window rather than a page. A month is a month.
- The calendar is drawn in the clinic's zone. FullCalendar only understands `UTC` and `local` unaided, so it takes the Luxon plugin: without one, an arbitrary `CLINIC_TIME_ZONE` would be ignored and every column would shift for a clinician not in UTC.
- Appointments are searched from the appointment table, which is a list. The search box that sat on the calendar page was removed rather than left looking functional.

### Check-in link

- A check-in link lives in one direction only: `Visit.appointmentId` is a foreign key onto `Appointment`, and it is what the check-in command writes and every read asks. `Appointment.visit` is the other end of that relation. `Appointment.appointmentId` is dropped, along with the foreign key that pointed the wrong way and had no referent on `Visit`.
- An archived visit still counts as checked in. Archiving retires a visit from clinical reads; it does not un-check-in the appointment that opened it.

## Consequence

`src/lib/utils.ts` and `src/lib/clinic-day.ts` no longer hold dates, and nothing outside `src/lib/clinic-time.ts` calls `Date`'s formatters. The cost is a module boundary to cross for any new date handling, which is the point: the alternative is what this replaced.

Deferring drag/resize is not a claim that it is wrong, only that it is not wanted without a decision about what a drag means for an appointment that a patient has already arrived for.

**Attachments are not supported.** There is no attachment read model, no storage, and no upload or download control anywhere in the app — not a stub, not a disabled button. There was never one to remove. A clinical record that can hold no document cannot promise one, and an affordance pointing at a feature that does not exist is worse than its absence, so the decision lives here rather than in the UI. Building it means a domain model first: what an attachment *is* (a scan, a photo, a referral letter, a result from another facility), what it belongs to (a visit, a patient, an order), where it is stored, who may read it, and what a deleted record does to the documents it holds — which is a real decision, because ADR 0002 archives records to retain their history and an attachment cannot be archived by setting a column. This is the one deferred item on #28 with no interface at all, and that is the honest state of it.

Role-based visibility of the provider column is still #30: the column now shows the provider's name for any provider rather than hiding non-doctors.

Resolves the #28 row of ADR 0001's deferred-scope table.
