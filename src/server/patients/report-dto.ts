import type { PatientType } from "@/generated/prisma";
import type {
  PatientAgeBandKey,
  PatientReportPeriod,
} from "./contract";

/**
 * The patient report read model. Plain browser-facing data: ISO instants rather
 * than `Date` objects, and every count paired with the same count for the period
 * before it, so the screen cannot show a figure without the comparison that
 * gives it a meaning.
 */

/**
 * The window a report counted, as instants.
 *
 * Half-open — `from` is included, `to` is the first moment past it — so two
 * consecutive windows neither drop a row that lands exactly on the boundary nor
 * count one twice.
 */
export type PatientReportWindowDto = {
  from: string;
  to: string;
};

/**
 * One period's figure, and the same figure for the period before it.
 *
 * Only the panels are paired. The breakdowns below describe the population as it
 * stands, so they carry no comparison rather than a misleading one.
 */
export type PatientReportPanelDto = {
  current: number;
  previous: number;
};

export type PatientAgeBandDto = {
  key: PatientAgeBandKey;
  label: string;
  count: number;
};

export type PatientTypeCountDto = {
  patientType: PatientType;
  count: number;
};

export type PatientReportDto = {
  /** The window this report counted, and the period that named it. */
  period: PatientReportWindowDto & { kind: PatientReportPeriod };
  /** The window every `previous` figure was counted over. */
  previousPeriod: PatientReportWindowDto;
  /** Each panel counted over `period` and over `previousPeriod`. */
  panels: {
    totalPatients: PatientReportPanelDto;
    newPatients: PatientReportPanelDto;
    archivedPatients: PatientReportPanelDto;
    seenPatients: PatientReportPanelDto;
  };
  ageGroups: PatientAgeBandDto[];
  patientTypes: PatientTypeCountDto[];
};