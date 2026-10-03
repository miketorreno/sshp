"use client";
import { queryOptions, useQuery, type QueryClient } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  archiveApiPaths,
  type ArchiveListQuery,
  type ArchiveSectionKey,
} from "@/server/archive/contract";
import type { ArchivePage } from "@/server/archive/dto";
import type { ArchivedAppointmentDto } from "@/server/appointments/dto";
import type { ArchivedPatientDto } from "@/server/patients/dto";
import type {
  ArchivedOrderDto,
  ArchivedVisitDto,
  ArchivedVitalsDto,
} from "@/server/visits/dto";

/**
 * The browser read surface for the archive. One read, asked for by section: the
 * archive is one screen with five lists on it, and each section answers the same
 * two questions — which archived records are there, and what stands between a reader
 * and the restore they want.
 *
 * The row type follows from the section, so a screen cannot ask for patients and
 * read them as orders: the section key names both the path and the shape.
 */

type ArchiveRowBySection = {
  patients: ArchivedPatientDto;
  appointments: ArchivedAppointmentDto;
  visits: ArchivedVisitDto;
  vitals: ArchivedVitalsDto;
  orders: ArchivedOrderDto;
};

export const archiveQueries = {
  section: <S extends ArchiveSectionKey>(
    section: S,
    query: ArchiveListQuery = {},
  ) =>
    queryOptions({
      queryKey: queryKeys.archive.section(section, query),
      queryFn: ({ signal }) =>
        apiGet<ArchivePage<ArchiveRowBySection[S]>>(
          archiveApiPaths.list(section, query),
          { signal },
        ),
    }),
};

/**
 * One section's page of archived records.
 *
 * Sections a role may not read are never asked for: the archive screen filters its
 * sections by permission before it renders, so there is no `enabled` flag here. A
 * read that was already refused once is a failure on every render, and the screen
 * that must not offer it does not have it.
 */
export const useArchivedRecords = <S extends ArchiveSectionKey>(
  section: S,
  query: ArchiveListQuery = {},
) => useQuery(archiveQueries.section(section, query));

/**
 * A restore takes one row out of the archive, and every section can be standing
 * behind it: bringing a visit back unblocks the readings and orders taken during it,
 * and bringing a patient back unblocks all of them at once. So a restore forgets
 * every archive read rather than the one it named — the alternative is a list whose
 * rows still say "restore the visit first" seconds after the visit came back.
 */
export async function invalidateArchiveWrites(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: queryKeys.archive.sections() });
}