"use client";
import { useClinicTimeZone } from "@/components/clinic-time-zone-provider";
import { Activity, UserMinus, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatClinicDate } from "@/lib/clinic-time";
import { usePatientReport } from "@/client/patients/queries";
import {
  PATIENT_REPORT_PERIODS,
  PATIENT_REPORT_TYPES,
  patientReportPeriodDays,
  type PatientReportPeriod,
} from "@/server/patients/contract";
import type {
  PatientReportPanelDto,
  PatientReportWindowDto,
} from "@/server/patients/report-dto";

/**
 * Built from the same day counts the read uses, so a label cannot promise "Last 30
 * days" over a window that turned out to be thirty-one.
 */
const PERIOD_LABELS = Object.fromEntries(
  PATIENT_REPORT_PERIODS.map((period) => [
    period,
    `Last ${patientReportPeriodDays(period)} days`,
  ]),
) as Record<PatientReportPeriod, string>;

/**
 * Keyed by the report's own type list rather than by its own keys, so a type added
 * to the schema cannot reach this screen with no label to draw it under.
 */
const PATIENT_TYPE_LABELS: Record<
  (typeof PATIENT_REPORT_TYPES)[number],
  string
> = {
  OUTPATIENT: "Outpatients",
  INPATIENT: "Admitted",
};

const PatientReportsPage = () => {
  const zone = useClinicTimeZone();
  const [period, setPeriod] = useState<PatientReportPeriod>("month");

  const { data: report, isPending, isError, error } =
    usePatientReport(period);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold my-2">Patient Reports</h1>
          {/* The window the figures belong to, in the clinic's own dates. A total
              with no dates on it cannot be reproduced or checked against a
              diary, which is the whole reason the read names its window. */}
          {report && (
            <p className="text-sm text-muted-foreground">
              {formatClinicDate(report.period.from, zone)} to{" "}
              {formatClinicDate(report.period.to, zone)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value as PatientReportPeriod)}
          >
            <SelectTrigger className="w-[180px]" aria-label="Reporting period">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {PATIENT_REPORT_PERIODS.map((candidate) => (
                <SelectItem key={candidate} value={candidate}>
                  {PERIOD_LABELS[candidate]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {isPending
          ? "Loading report"
          : isError
            ? "Report could not be loaded"
            : report
              ? `${report.panels.totalPatients.current} total patients, ${report.panels.newPatients.current} new, ${report.panels.archivedPatients.current} archived, ${report.panels.seenPatients.current} seen`
              : ""}
      </p>

      {isPending ? (
        <div className="flex justify-center items-center h-40">
          <p>Loading report...</p>
        </div>
      ) : isError || !report ? (
        <div className="flex justify-center items-center h-40">
          <p className="text-red-600">
            {error instanceof Error ? error.message : "Failed to load report"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Panel
              title="Total Patients"
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              panel={report.panels.totalPatients}
              window={report.period}
              previousWindow={report.previousPeriod}
              zone={zone}
              caption="Not archived today"
            />
            <Panel
              title="New Patients"
              icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
              panel={report.panels.newPatients}
              window={report.period}
              previousWindow={report.previousPeriod}
              zone={zone}
              caption="Registered in this period"
            />
            <Panel
              title="Archived Patients"
              icon={<UserMinus className="h-4 w-4 text-muted-foreground" />}
              panel={report.panels.archivedPatients}
              window={report.period}
              previousWindow={report.previousPeriod}
              zone={zone}
              caption="Archived in this period"
            />
            <Panel
              title="Patients Seen"
              icon={<Activity className="h-4 w-4 text-muted-foreground" />}
              panel={report.panels.seenPatients}
              window={report.period}
              previousWindow={report.previousPeriod}
              zone={zone}
              caption="With a visit in this period"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Patient Demographics</CardTitle>
                {/* Says "today" rather than leaving the period above it to speak
                    for these: the panels are counted over the period, these are
                    counted as they stand, and a reader who assumes otherwise reads
                    a distribution that was never asked for. */}
                <p className="text-sm text-muted-foreground">
                  Active patients as they are today
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Age groups</span>
                    <span className="text-sm font-medium">
                      {report.panels.totalPatients.current} patients
                    </span>
                  </div>
                  {/* Every band, including an empty one: a bar chart that drops an
                      empty band redraws its axis as the population moves, and the
                      reader ends up comparing two shapes. */}
                  {report.ageGroups.map((band) => (
                    <Bar
                      key={band.key}
                      label={band.label}
                      count={band.count}
                      total={report.panels.totalPatients.current}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Patient Type</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Active patients as they are today
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Current type</span>
                    <span className="text-sm font-medium">Count</span>
                  </div>
                  {report.patientTypes.map((type) => (
                    <Bar
                      key={type.patientType}
                      label={PATIENT_TYPE_LABELS[type.patientType]}
                      count={type.count}
                      total={report.panels.totalPatients.current}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * One figure, and the figure it is being compared against.
 *
 * The comparison is a count, never a percentage: a percentage of a standing
 * total like 892 is "12% of the patients who have ever existed" as often as it
 * is a change, so it reads as growth when nothing changed. Two counts and the
 * window each covers say what happened.
 */
function Panel({
  title,
  icon,
  panel,
  window,
  previousWindow,
  zone,
  caption,
}: {
  title: string;
  icon: React.ReactNode;
  panel: PatientReportPanelDto;
  window: PatientReportWindowDto;
  previousWindow: PatientReportWindowDto;
  zone: string;
  caption: string;
}) {
  const change = panel.current - panel.previous;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{panel.current.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">{caption}</p>
        <p className="text-xs text-muted-foreground">
          {change === 0
            ? `Same as ${formatClinicDate(previousWindow.from, zone)} to ${formatClinicDate(previousWindow.to, zone)}`
            : `${change > 0 ? "+" : ""}${change.toLocaleString()} against ${formatClinicDate(previousWindow.from, zone)} to ${formatClinicDate(previousWindow.to, zone)}`}
          {" · counted to "}
          {formatClinicDate(window.to, zone)}
        </p>
      </CardContent>
    </Card>
  );
}

function Bar({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const share = total === 0 ? 0 : Math.round((count / total) * 100);

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <div className="h-2 w-32 rounded-full bg-muted">
          {/* The width is decorative; the count beside it is the figure. */}
          <div
            className="h-2 rounded-full bg-primary"
            style={{ width: `${share}%` }}
            aria-hidden="true"
          />
        </div>
        <span className="text-sm">
          {count.toLocaleString()} ({share}%)
        </span>
      </div>
    </div>
  );
}

export default PatientReportsPage;
