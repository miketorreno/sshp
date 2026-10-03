"use client";
import { Loader2 } from "lucide-react";
import { useClinicTimeZone } from "@/components/clinic-time-zone-provider";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatClinicDateTime } from "@/lib/clinic-time";
import type { RestoreBlockedBy } from "@/server/archive/contract";
import { restoreBlockedCopy } from "@/server/archive/contract";
import type { ArchivedAppointmentDto } from "@/server/appointments/dto";
import type { ArchivedPatientDto } from "@/server/patients/dto";
import type {
  ArchivedOrderDto,
  ArchivedVisitDto,
  ArchivedVitalsDto,
} from "@/server/visits/dto";

/**
 * The archive's five tables.
 *
 * One component per section rather than one table over a union: each record is
 * recognised by different columns, and a table that picked columns per row type at
 * runtime would be a switch anyway — one the reader's eye cannot check. What the
 * sections share is the Restore column and the empty answer, so those are written
 * once below.
 */

export type ArchiveTableProps<T> = {
  rows: readonly T[];
  /** Whether this role is offered a Restore at all; see ADR 0005. */
  canRestore: boolean;
  /** The record being restored right now, so one button can wait rather than all. */
  restoringId: string | null;
  onRestore: (row: T) => void;
};

/** The parts every archived record shares, which is what Restore is about. */
type RestorableRow = {
  id: string;
  restoreBlockedBy: RestoreBlockedBy | null;
};

export const ArchivedPatientsTable = ({
  rows,
  ...restore
}: ArchiveTableProps<ArchivedPatientDto>) => {
  const zone = useClinicTimeZone();

  return (
    <ArchiveTable
      canRestore={restore.canRestore}
      restoringId={restore.restoringId}
      onRestore={restore.onRestore}
      heads={["Code", "Name", "Date of birth", "Type", "Archived"]}
      rows={rows}
      render={(patient, cell) => (
        <TableRow key={patient.id}>
          <TableCell>{patient.patientCode}</TableCell>
          <TableCell>
            {patient.firstName} {patient.lastName}
          </TableCell>
          <TableCell>{patient.dateOfBirth}</TableCell>
          <TableCell>{patient.patientType}</TableCell>
          <TableCell>
            {formatClinicDateTime(patient.archivedAt, zone)}
          </TableCell>
          {cell(patient)}
        </TableRow>
      )}
    />
  );
};

export const ArchivedAppointmentsTable = ({
  rows,
  ...restore
}: ArchiveTableProps<ArchivedAppointmentDto>) => {
  const zone = useClinicTimeZone();

  return (
    <ArchiveTable
      canRestore={restore.canRestore}
      restoringId={restore.restoringId}
      onRestore={restore.onRestore}
      heads={["Patient", "Type", "Starts", "Status", "Reason", "Archived"]}
      rows={rows}
      render={(appointment, cell) => (
        <TableRow key={appointment.id}>
          <TableCell>{appointment.patient.name}</TableCell>
          <TableCell>{appointment.appointmentType}</TableCell>
          <TableCell>
            {formatClinicDateTime(appointment.startDateTime, zone)}
          </TableCell>
          <TableCell>{appointment.appointmentStatus}</TableCell>
          <TableCell>{appointment.reason || "-"}</TableCell>
          <TableCell>
            {formatClinicDateTime(appointment.archivedAt, zone)}
          </TableCell>
          {cell(appointment)}
        </TableRow>
      )}
    />
  );
};

export const ArchivedVisitsTable = ({
  rows,
  ...restore
}: ArchiveTableProps<ArchivedVisitDto>) => {
  const zone = useClinicTimeZone();

  return (
    <ArchiveTable
      canRestore={restore.canRestore}
      restoringId={restore.restoringId}
      onRestore={restore.onRestore}
      heads={["Patient", "Type", "Starts", "Reason", "Archived"]}
      rows={rows}
      render={(visit, cell) => (
        <TableRow key={visit.id}>
          <TableCell>{visit.patient.name}</TableCell>
          <TableCell>{visit.visitType}</TableCell>
          <TableCell>{formatClinicDateTime(visit.startDateTime, zone)}</TableCell>
          <TableCell>{visit.reason || "-"}</TableCell>
          <TableCell>{formatClinicDateTime(visit.archivedAt, zone)}</TableCell>
          {cell(visit)}
        </TableRow>
      )}
    />
  );
};

export const ArchivedVitalsTable = ({
  rows,
  ...restore
}: ArchiveTableProps<ArchivedVitalsDto>) => {
  const zone = useClinicTimeZone();

  return (
    <ArchiveTable
      canRestore={restore.canRestore}
      restoringId={restore.restoringId}
      onRestore={restore.onRestore}
      heads={["Patient", "Recorded", "BP", "Heart rate", "SpO₂", "Archived"]}
      rows={rows}
      render={(vitals, cell) => (
        <TableRow key={vitals.id}>
          <TableCell>{vitals.patient.name}</TableCell>
          <TableCell>{formatClinicDateTime(vitals.recordedAt, zone)}</TableCell>
          <TableCell>
            {bloodPressure(vitals.systolicBP, vitals.diastolicBP)}
          </TableCell>
          <TableCell>{vitals.heartRate ?? "-"}</TableCell>
          <TableCell>{vitals.oxygenSaturation ?? "-"}</TableCell>
          <TableCell>{formatClinicDateTime(vitals.archivedAt, zone)}</TableCell>
          {cell(vitals)}
        </TableRow>
      )}
    />
  );
};

export const ArchivedOrdersTable = ({
  rows,
  ...restore
}: ArchiveTableProps<ArchivedOrderDto>) => {
  const zone = useClinicTimeZone();

  return (
    <ArchiveTable
      canRestore={restore.canRestore}
      restoringId={restore.restoringId}
      onRestore={restore.onRestore}
      heads={["Patient", "Kind", "Order", "Instructions", "Ordered", "Archived"]}
      rows={rows}
      render={(order, cell) => (
        <TableRow key={order.id}>
          <TableCell>{order.patient.name}</TableCell>
          <TableCell>{order.kind}</TableCell>
          <TableCell>{order.orderName || "-"}</TableCell>
          <TableCell>{order.instructions || "-"}</TableCell>
          <TableCell>{formatClinicDateTime(order.orderedAt, zone)}</TableCell>
          <TableCell>{formatClinicDateTime(order.archivedAt, zone)}</TableCell>
          {cell(order)}
        </TableRow>
      )}
    />
  );
};

/**
 * The table itself: a head row, either the rows or the answer to there being none,
 * and a Restore column every section renders.
 *
 * The Restore column is passed in as a `cell` function rather than appended here,
 * because it is the one cell that takes a typed row: each section's rows differ, and
 * a cast at the boundary would throw that difference away rather than check it.
 */
function ArchiveTable<T extends RestorableRow>({
  canRestore,
  restoringId,
  onRestore,
  heads,
  rows,
  render,
}: ArchiveTableProps<T> & {
  heads: readonly string[];
  render: (row: T, cell: (row: T) => React.ReactNode) => React.ReactNode;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {heads.map((head) => (
            <TableHead key={head}>{head}</TableHead>
          ))}
          <TableHead className="w-[140px]">Restore</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={heads.length + 1} className="text-center py-12">
              Nothing archived in this section.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) =>
            render(row, (restorable) => (
              <TableCell key="restore">
                <RestoreCell
                  row={restorable}
                  canRestore={canRestore}
                  restoringId={restoringId}
                  onRestore={onRestore}
                />
              </TableCell>
            )),
          )
        )}
      </TableBody>
    </Table>
  );
}

/**
 * One row's Restore, or the reason there is not one.
 *
 * A record whose patient or visit is still archived cannot come back first, so it is
 * not offered at all: the copy names the record to restore before this one, which is
 * the answer that keeps a reader from trying the same refused thing twice. The copy
 * is shown to a role that cannot restore anything too — what stands in the way is a
 * fact about the record, not an offer.
 */
function RestoreCell<T extends RestorableRow>({
  row,
  canRestore,
  restoringId,
  onRestore,
}: Omit<ArchiveTableProps<T>, "rows"> & { row: T }) {
  const blocked = restoreBlockedCopy(row.restoreBlockedBy);

  if (blocked) {
    return (
      <p className="text-xs text-muted-foreground max-w-[200px]">{blocked}</p>
    );
  }

  if (!canRestore) return <span className="text-muted-foreground">-</span>;

  const restoring = restoringId === row.id;

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={restoringId !== null}
      onClick={() => onRestore(row)}
    >
      {restoring ? (
        <>
          <Loader2
            className="h-4 w-4 animate-spin"
            aria-hidden="true"
            aria-label="Restoring"
          />
          Restoring
        </>
      ) : (
        "Restore"
      )}
    </Button>
  );
}

/** A reading's blood pressure, or the absence of one, in one place. */
function bloodPressure(
  systolic: number | null,
  diastolic: number | null,
): string {
  if (systolic === null || diastolic === null) return "-";

  return `${systolic}/${diastolic}`;
}