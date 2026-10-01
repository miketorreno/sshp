import { calculateAgeAt, clinicTimeZone } from "@/lib/clinic-time";
import { getPrisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/server/access";
import {
  PATIENT_AGE_BANDS,
  PATIENT_REPORT_TYPES,
  patientReportPeriodDays,
  type PatientAgeBandKey,
  type PatientReportPeriod,
} from "./contract";
import type {
  PatientAgeBandDto,
  PatientReportDto,
  PatientReportPanelDto,
  PatientReportWindowDto,
  PatientTypeCountDto,
} from "./report-dto";

/**
 * The patient report, as a read rather than as a screen's own arithmetic.
 *
 * Every number on the report screen used to be typed into the page: a total of
 * 1,234 patients, a 12% rise, and a set of age-group percentages that no query
 * produced. A figure nobody can trace back to a row is a guess wearing a
 * decimal point, so the counts are read from the same tables the rest of the app
 * reads, and each one is defined by what it counts:
 *
 * - **Total patients** — active patients now, and how many were active at the
 *   same moment one period earlier. It is a standing total, so its comparison is
 *   against a *snapshot* rather than against activity in the period.
 * - **New patients** — patients registered inside the period.
 * - **Archived patients** — patients archived inside the period. Archiving
 *   reduces the active total, so this is the one movement that explains a total
 *   that fell. It is a count of archival events, not a read of archived clinical
 *   data: what the period held of a departed patient's history stays out of every
 *   other figure here, as ADR-0002 requires.
 * - **Patients seen** — patients with a visit started inside the period. Named for
 *   what it counts rather than for "active", which in this app means not archived;
 *   the panel next to it already says what was counted.
 *
 * The comparison beside each panel is the same length of time immediately before,
 * so "+4" means four more than the month before, not four more than the clinic
 * has ever had. Every comparison is the same shape: this period and the one
 * before it, so a screen cannot accidentally show a delta against a different
 * window than the one it labelled.
 *
 * The two breakdowns are the exception, and say so rather than pretending
 * otherwise: age groups and patient types describe who the clinic's patients are
 * *now*, and a band counted as it stood a month ago would be a fact about a
 * population that no longer exists.
 */

export async function getPatientReport(
  period: PatientReportPeriod = "month",
  now: Date = new Date()
): Promise<PatientReportDto> {
  await requirePermission(PERMISSIONS.REPORTS_READ);

  const window = windowEndingAt(now, period);
  const previous = windowEndingAt(window.from, period);

  const [panels, ageGroups, patientTypes] = await Promise.all([
    Promise.all([
      totalPatientsAt(window),
      newPatients(window),
      archivedPatients(window),
      seenInWindow(window),
      totalPatientsAt(previous),
      newPatients(previous),
      archivedPatients(previous),
      seenInWindow(previous),
    ]),
    ageBandCounts(now),
    patientTypeCounts(),
  ]);

  return {
    period: { kind: period, ...asDto(window) },
    previousPeriod: asDto(previous),
    // Read in the order the panels are named: four counts over this window, then
    // the same four over the window before it.
    panels: {
      totalPatients: panel(panels, 0),
      newPatients: panel(panels, 1),
      archivedPatients: panel(panels, 2),
      seenPatients: panel(panels, 3),
    },
    ageGroups,
    patientTypes,
  };
}

/** A window as instants, which is what the database and the arithmetic want. */
type Window = { from: Date; to: Date };

/** A window as strings, which is what crosses the wire. */
function asDto(window: Window): PatientReportWindowDto {
  return { from: window.from.toISOString(), to: window.to.toISOString() };
}

/** The trailing window of `period` length that ends at `to`. */
function windowEndingAt(to: Date, period: PatientReportPeriod): Window {
  const days = patientReportPeriodDays(period);
  return { from: new Date(to.getTime() - days * DAY_IN_MILLIS), to };
}

const DAY_IN_MILLIS = 24 * 60 * 60 * 1000;

/**
 * Patients seen at the window's closing moment: registered before it, and
 * neither archived before it nor archived at all.
 *
 * The total is a snapshot rather than an activity count, so it is compared
 * against the same snapshot a period earlier — a panel whose number grew because
 * patients arrived and a panel whose number grew because a period passed would
 * otherwise be indistinguishable.
 */
async function totalPatientsAt({ to }: Window) {
  return getPrisma().patient.count({
    where: {
      createdAt: { lte: to },
      OR: [{ deletedAt: null }, { deletedAt: { gt: to } }],
    },
  });
}

async function newPatients({ from, to }: Window) {
  return getPrisma().patient.count({
    where: { deletedAt: null, createdAt: { gte: from, lt: to } },
  });
}

async function archivedPatients({ from, to }: Window) {
  return getPrisma().patient.count({
    where: { deletedAt: { gte: from, lt: to } },
  });
}

/**
 * Distinct active patients who were seen in the window.
 *
 * Read through the visits rather than through the patients, because being seen
 * is what a visit records. A visit of an archived patient is not activity: the
 * patient has left normal clinical reads, so counting them would report a
 * departed patient as one the clinic is still seeing.
 */
async function seenInWindow({ from, to }: Window) {
  const visits = await getPrisma().visit.findMany({
    where: { deletedAt: null, startDateTime: { gte: from, lt: to } },
    select: { patientId: true },
  });

  const patientIds = [...new Set(visits.map((visit) => visit.patientId))];

  if (patientIds.length === 0) return 0;

  return getPrisma().patient.count({
    where: { id: { in: patientIds }, deletedAt: null },
  });
}

/**
 * Every active patient in exactly one age band, and every patient type the
 * schema allows whether or not anyone has it.
 *
 * Bands come back with their zero counts rather than being left out: a chart
 * that silently drops an empty band redraws its axis when the clinic's
 * population moves, and the reader is left comparing two charts of different
 * shapes.
 */
async function ageBandCounts(asOf: Date): Promise<PatientAgeBandDto[]> {
  const patients = await getPrisma().patient.findMany({
    where: { deletedAt: null },
    select: { id: true, dateOfBirth: true },
  });

  // Aged in the clinic's own zone, by the same rule the patient table ages by,
  // so a band on this report and an age beside a name cannot disagree about a
  // patient born the day before a birthday.
  const zone = clinicTimeZone();

  const counts = new Map<PatientAgeBandKey, number>(
    PATIENT_AGE_BANDS.map((band) => [band.key, 0]),
  );

  for (const patient of patients) {
    const age = calculateAgeAt(patient.dateOfBirth, zone, asOf);
    const band = age === null ? UNKNOWN_BAND : bandFor(age);

    counts.set(band.key, (counts.get(band.key) ?? 0) + 1);
  }

  return PATIENT_AGE_BANDS.map((band) => ({
    key: band.key,
    label: band.label,
    count: counts.get(band.key) ?? 0,
  }));
}

/** The one band every patient whose age cannot be read lands in. */
const UNKNOWN_BAND = PATIENT_AGE_BANDS.find(
  (band) => band.key === "unknown",
) as (typeof PATIENT_AGE_BANDS)[number];

function bandFor(age: number): (typeof PATIENT_AGE_BANDS)[number] {
  return (
    PATIENT_AGE_BANDS.find((band) => age >= band.from && age <= band.to) ??
    UNKNOWN_BAND
  );
}

async function patientTypeCounts(): Promise<PatientTypeCountDto[]> {
  const patients = await getPrisma().patient.findMany({
    where: { deletedAt: null },
    select: { patientType: true },
  });

  const counted = (patientType: string) =>
    patients.filter((patient) => patient.patientType === patientType).length;

  return PATIENT_REPORT_TYPES.map((patientType) => ({
    patientType,
    count: counted(patientType),
  }));
}

/** The nth panel's two counts: this window's, and the window before it. */
function panel(counts: number[], index: number): PatientReportPanelDto {
  return { current: counts[index], previous: counts[index + 4] };
}