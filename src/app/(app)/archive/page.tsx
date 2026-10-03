"use client";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { restoreAppointment } from "@/app/actions/appointment-actions";
import {
  restoreImagingOrder,
  restoreLabOrder,
  restoreMedicationOrder,
} from "@/app/actions/order-actions";
import { restorePatient } from "@/app/actions/patient-actions";
import { restoreVisit } from "@/app/actions/visit-actions";
import { restoreVitals } from "@/app/actions/vitals-actions";
import {
  ArchivedAppointmentsTable,
  ArchivedOrdersTable,
  ArchivedPatientsTable,
  ArchivedVisitsTable,
  ArchivedVitalsTable,
} from "@/components/archive/archive-tables";
import { usePermissions } from "@/components/permissions-provider";
import Pagination from "@/components/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useArchivedRecords } from "@/client/archive/queries";
import { useArchiveRestorer } from "@/client/archive/restore";
import { lastPageOf } from "@/lib/paging";
import { PERMISSIONS } from "@/server/permissions";
import {
  ARCHIVE_PAGE_SIZE,
  ARCHIVE_SECTIONS,
  type ArchiveSectionKey,
} from "@/server/archive/contract";

/**
 * The archive: one screen, five sections, one Restore per row.
 *
 * Sections a role may not read are not rendered at all, because the read behind them
 * would be refused and a tab that always fails is worse than no tab. Restore is a
 * separate permission again — a clinician may see what was archived without being
 * able to bring it back — so the column is there and the buttons are not. See
 * ADR 0005.
 *
 * Every row carries what stands in the way of its restore, so a record whose patient
 * or visit is still archived says so in place rather than failing when pressed. See
 * ADR 0002.
 *
 * One panel per section rather than one panel over a union: each section reads its own
 * rows and runs its own restore command, and the row type is what holds those two
 * together. The alternative is one read whose rows are every kind of record at once,
 * and a restore that has to be cast to believe which kind it is holding.
 */

const ArchivePage = () => {
  const { can } = usePermissions();

  // Only the sections this role may read. A role that may archive nothing has no
  // archive, which the screen says rather than showing five empty tables.
  const sections = ARCHIVE_SECTIONS.filter((section) =>
    can(section.archivePermission),
  );

  const [sectionKey, setSectionKey] = useState<ArchiveSectionKey>(
    sections[0]?.key ?? "patients",
  );

  const section = sections.find((candidate) => candidate.key === sectionKey);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold my-2">Archive</h1>

      {!section ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            You cannot read the archive.
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs
            value={section.key}
            onValueChange={(next) => setSectionKey(next as ArchiveSectionKey)}
          >
            <TabsList>
              {sections.map((candidate) => (
                <TabsTrigger key={candidate.key} value={candidate.key}>
                  {candidate.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* The panel for the section on screen, and only that one: a tab the
              reader is not on has nothing to ask for, and a screen that read all
              five at once would answer one question with five requests. A panel also
              keeps its own page, because it is only mounted while its tab is
              showing — so the reader comes back to the page they left. */}
          {section.key === "patients" && <PatientsPanel />}
          {section.key === "appointments" && <AppointmentsPanel />}
          {section.key === "visits" && <VisitsPanel />}
          {section.key === "vitals" && <VitalsPanel />}
          {section.key === "orders" && <OrdersPanel />}
        </>
      )}
    </div>
  );
};

const PatientsPanel = () => {
  const { can } = usePermissions();
  const { restoringId, restore } = useArchiveRestorer("Patient");
  const paging = useArchivePage();
  const read = useArchivedRecords("patients", {
    page: paging.page,
    limit: ARCHIVE_PAGE_SIZE,
  });
  const rows = read.data?.rows ?? [];
  const totalCount = read.data?.totalCount ?? 0;

  paging.clampTo(totalCount, read);

  return (
    <ArchivePanel
      title="patients"
      read={read}
      paging={paging}
      rowCount={rows.length}
      totalCount={totalCount}
    >
      <ArchivedPatientsTable
        rows={rows}
        canRestore={can(PERMISSIONS.PATIENTS_RESTORE)}
        restoringId={restoringId}
        onRestore={(patient) =>
          restore(patient, () => restorePatient(patient.id))
        }
      />
    </ArchivePanel>
  );
};

const AppointmentsPanel = () => {
  const { can } = usePermissions();
  const { restoringId, restore } = useArchiveRestorer("Appointment");
  const paging = useArchivePage();
  const read = useArchivedRecords("appointments", {
    page: paging.page,
    limit: ARCHIVE_PAGE_SIZE,
  });
  const rows = read.data?.rows ?? [];
  const totalCount = read.data?.totalCount ?? 0;

  paging.clampTo(totalCount, read);

  return (
    <ArchivePanel
      title="appointments"
      read={read}
      paging={paging}
      rowCount={rows.length}
      totalCount={totalCount}
    >
      <ArchivedAppointmentsTable
        rows={rows}
        canRestore={can(PERMISSIONS.APPOINTMENTS_RESTORE)}
        restoringId={restoringId}
        onRestore={(appointment) =>
          restore(appointment, () => restoreAppointment(appointment.id))
        }
      />
    </ArchivePanel>
  );
};

const VisitsPanel = () => {
  const { can } = usePermissions();
  const { restoringId, restore } = useArchiveRestorer("Visit");
  const paging = useArchivePage();
  const read = useArchivedRecords("visits", {
    page: paging.page,
    limit: ARCHIVE_PAGE_SIZE,
  });
  const rows = read.data?.rows ?? [];
  const totalCount = read.data?.totalCount ?? 0;

  paging.clampTo(totalCount, read);

  return (
    <ArchivePanel
      title="visits"
      read={read}
      paging={paging}
      rowCount={rows.length}
      totalCount={totalCount}
    >
      <ArchivedVisitsTable
        rows={rows}
        canRestore={can(PERMISSIONS.VISITS_RESTORE)}
        restoringId={restoringId}
        onRestore={(visit) => restore(visit, () => restoreVisit(visit.id))}
      />
    </ArchivePanel>
  );
};

const VitalsPanel = () => {
  const { can } = usePermissions();
  const { restoringId, restore } = useArchiveRestorer("Reading");
  const paging = useArchivePage();
  const read = useArchivedRecords("vitals", {
    page: paging.page,
    limit: ARCHIVE_PAGE_SIZE,
  });
  const rows = read.data?.rows ?? [];
  const totalCount = read.data?.totalCount ?? 0;

  paging.clampTo(totalCount, read);

  return (
    <ArchivePanel
      title="readings"
      read={read}
      paging={paging}
      rowCount={rows.length}
      totalCount={totalCount}
    >
      <ArchivedVitalsTable
        rows={rows}
        canRestore={can(PERMISSIONS.VITALS_RESTORE)}
        restoringId={restoringId}
        // A reading is addressed by the visit it was taken during as well as by its
        // own id: the command needs both, and the row carries both.
        onRestore={(vitals) =>
          restore(vitals, () => restoreVitals(vitals.visitId, vitals.id))
        }
      />
    </ArchivePanel>
  );
};

const OrdersPanel = () => {
  const { can } = usePermissions();
  const { restoringId, restore } = useArchiveRestorer("Order");
  const paging = useArchivePage();
  const read = useArchivedRecords("orders", {
    page: paging.page,
    limit: ARCHIVE_PAGE_SIZE,
  });
  const rows = read.data?.rows ?? [];
  const totalCount = read.data?.totalCount ?? 0;

  paging.clampTo(totalCount, read);

  return (
    <ArchivePanel
      title="orders"
      read={read}
      paging={paging}
      rowCount={rows.length}
      totalCount={totalCount}
    >
      <ArchivedOrdersTable
        rows={rows}
        canRestore={can(PERMISSIONS.ORDERS_RESTORE)}
        restoringId={restoringId}
        // Three tables, one list: the row says which table it came from, and that is
        // what decides which of the three commands is the one to run.
        onRestore={(order) =>
          restore(order, () => {
            const command = {
              LAB: restoreLabOrder,
              IMAGING: restoreImagingOrder,
              MEDICATION: restoreMedicationOrder,
            }[order.kind];

            return command(order.visitId, order.id);
          })
        }
      />
    </ArchivePanel>
  );
};

/**
 * Which page of a section's list is on screen, and the way back from one that no
 * longer exists.
 *
 * The clamp is the point of the hook: restoring the last record of the last page
 * leaves the reader on a page the archive does not have, with nothing to tell them
 * so. Stepping back is the same answer the read gives, reached while rendering in
 * the component that owns the page, so the reader never sees the page that stopped
 * existing at all.
 *
 * Only once the read has settled, because mid-flight the count belongs to the page
 * being replaced and every last page looks like the first.
 */
function useArchivePage() {
  const [page, setPage] = useState(1);

  const clampTo = (totalCount: number, read: ArchiveRead) => {
    const lastPage = lastPageOf(totalCount, ARCHIVE_PAGE_SIZE);

    if (!read.isPending && !read.isError && page > lastPage) setPage(lastPage);
  };

  return { page, setPage, clampTo };
}

/** What one section's read tells the panel drawn around its table. */
type ArchiveRead = {
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  error: Error | null;
};

/**
 * The card around one section's table: what is on screen while the read is in flight,
 * while it fails, and once it lands.
 *
 * Shared by all five rather than written five times, because the answers are the same
 * for every archive list — "nothing archived in this section" is the one empty state
 * the archive needs, where a screen with a search box has two.
 */
function ArchivePanel({
  title,
  read,
  paging,
  rowCount,
  totalCount,
  children,
}: {
  title: string;
  read: ArchiveRead;
  paging: ReturnType<typeof useArchivePage>;
  rowCount: number;
  totalCount: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="mt-4">
      <CardContent>
        {/* Announced rather than drawn: the rows change under a reader who cannot see
            them change, and the count and the failure are the two things they cannot
            work out for themselves. */}
        <p className="sr-only" role="status" aria-live="polite">
          {announcement({ read, title, rowCount, totalCount })}
        </p>

        {read.isPending ? (
          <div className="flex justify-center items-center h-40">
            <p>Loading archived {title}...</p>
          </div>
        ) : read.isError ? (
          <div className="flex justify-center items-center h-40">
            <p className="text-red-600">
              {read.error?.message ?? "Failed to load archived records"}
            </p>
          </div>
        ) : (
          children
        )}

        {/* A spinner beside the rows rather than in place of them: the rows on screen
            are still the ones being read, and blanking them for the round trip is a
            flash with no information in it. */}
        {read.isFetching && !read.isPending && (
          <div className="flex justify-center items-center pt-4">
            <Loader2
              className="h-5 w-5 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        )}

        {/* Hidden while a read is in flight, so the controls never describe rows that
            have already been replaced. */}
        {!read.isPending && !read.isError && (
          <Pagination
            page={paging.page}
            rowCount={rowCount}
            pageSize={ARCHIVE_PAGE_SIZE}
            totalCount={totalCount}
            onPageChange={paging.setPage}
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * What a screen reader is told about the list.
 *
 * Said once per settled change rather than on every render: announcing each
 * intermediate read would narrate the reader's own paging back at them.
 */
function announcement({
  read,
  title,
  rowCount,
  totalCount,
}: {
  read: ArchiveRead;
  title: string;
  rowCount: number;
  totalCount: number;
}): string {
  if (read.isPending) return `Loading archived ${title}`;
  if (read.isError) return `Archived ${title} could not be loaded`;
  if (read.isFetching) return "";
  if (rowCount === 0) return `No archived ${title} to show`;

  return `Showing ${rowCount} of ${totalCount} archived ${title}`;
}

export default ArchivePage;