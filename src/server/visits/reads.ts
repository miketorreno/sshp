import { getPrisma } from "@/lib/prisma";
import { clinicTimeZone, endOfDay, startOfDay } from "@/lib/clinic-time";
import { PERMISSIONS, requirePermission } from "@/server/access";
import type { ArchiveListQuery } from "@/server/archive/contract";
import type { ArchivePage } from "@/server/archive/dto";
import {
  ARCHIVED_RECORD,
  MOST_RECENTLY_ARCHIVED,
  pageOf,
} from "@/server/archive/reads";
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  type VisitListQuery,
} from "./contract";
import {
  toArchivedOrder,
  toArchivedVitals,
  toArchivedVisit,
  toVisitDetail,
  toVisitSummary,
  type ArchivedOrderDto,
  type ArchivedVitalsDto,
  type ArchivedVisitDto,
  type TaggedArchivedOrder,
  type VisitDetailDto,
  type VisitSummaryDto,
} from "./dto";

/**
 * Visit reads for staff screens. Every read requires a session that holds
 * `visits:read`, and every read hides archived records: an archived visit is history, a visit whose patient is
 * archived is inactive rather than active, and a record archived inside a visit
 * leaves the visit it was recorded during.
 *
 * The archive is the one exception, and it asks for the matching `:archive` instead:
 * reading the history is not reading the record.
 */

const ACTIVE_VISIT = {
  deletedAt: null,
  patient: { deletedAt: null },
} as const;

const ACTIVE = { deletedAt: null } as const;

const VISIT_RELATIONS = {
  patient: true,
  provider: true,
} as const;

const VISIT_DETAIL_RELATIONS = {
  ...VISIT_RELATIONS,
  vitals: {
    where: ACTIVE,
    orderBy: { recordedAt: "desc" },
    include: { recordedBy: true },
  },
  labOrders: {
    where: ACTIVE,
    orderBy: { orderedAt: "desc" },
    include: { orderedBy: true },
  },
  imagingOrders: {
    where: ACTIVE,
    orderBy: { orderedAt: "desc" },
    include: { orderedBy: true },
  },
  medOrders: {
    where: ACTIVE,
    orderBy: { orderedAt: "desc" },
    include: { medication: { select: { name: true } }, orderedBy: true },
  },
  clinicalNotes: {
    where: ACTIVE,
    orderBy: { createdAt: "desc" },
    include: { author: true },
  },
  diagnoses: {
    where: ACTIVE,
    orderBy: { diagnosedAt: "desc" },
    include: { diagnosedBy: true },
  },
  procedures: {
    where: ACTIVE,
    orderBy: { performedAt: "desc" },
    include: { performedBy: true },
  },
} as const;

export async function listVisits(
  query: VisitListQuery = {},
): Promise<VisitSummaryDto[]> {
  await requirePermission(PERMISSIONS.VISITS_READ);

  const visits = await getPrisma().visit.findMany({
    where: {
      ...ACTIVE_VISIT,
      ...startDateTimeWindow(query),
      ...(query.visitType ? { visitType: query.visitType } : {}),
    },
    include: VISIT_RELATIONS,
    orderBy: { startDateTime: "asc" },
    take: clamp(query.limit),
  });

  return visits.map(toVisitSummary);
}

/** Reads an active visit, or null when it is missing or inactive. */
export async function getVisitDetail(
  id: string,
): Promise<VisitDetailDto | null> {
  await requirePermission(PERMISSIONS.VISITS_READ);

  const visit = await getPrisma().visit.findFirst({
    where: { id, ...ACTIVE_VISIT },
    include: VISIT_DETAIL_RELATIONS,
  });

  if (!visit) return null;

  return toVisitDetail(visit);
}

/**
 * One page of archived visits, most recently archived first.
 *
 * Only `deletedAt` is asked about, where the active list also insists on an active
 * patient: a visit of an archived patient has left the day's list, and this is where
 * a reader goes to find it.
 */
export async function listArchivedVisits(
  query: ArchiveListQuery = {},
): Promise<ArchivePage<ArchivedVisitDto>> {
  await requirePermission(PERMISSIONS.VISITS_ARCHIVE);

  const { page, pageSize, skip, take } = pageOf(query);

  const [visits, totalCount] = await Promise.all([
    getPrisma().visit.findMany({
      where: ARCHIVED_RECORD,
      include: { patient: true },
      orderBy: MOST_RECENTLY_ARCHIVED,
      skip,
      take,
    }),
    getPrisma().visit.count({ where: ARCHIVED_RECORD }),
  ]);

  return { rows: visits.map(toArchivedVisit), page, pageSize, totalCount };
}

/**
 * One page of archived readings, most recently archived first.
 *
 * The visit is included, and the patient through it, because a reading is not
 * identifiable on its own: it is a set of numbers taken during a visit, and the
 * archive has to be able to say whose they were and what has to be restored first.
 */
export async function listArchivedVitals(
  query: ArchiveListQuery = {},
): Promise<ArchivePage<ArchivedVitalsDto>> {
  await requirePermission(PERMISSIONS.VITALS_ARCHIVE);

  const { page, pageSize, skip, take } = pageOf(query);

  const [readings, totalCount] = await Promise.all([
    getPrisma().vitals.findMany({
      where: ARCHIVED_RECORD,
      include: {
        recordedBy: true,
        visit: { include: { patient: true } },
      },
      orderBy: MOST_RECENTLY_ARCHIVED,
      skip,
      take,
    }),
    getPrisma().vitals.count({ where: ARCHIVED_RECORD }),
  ]);

  return { rows: readings.map(toArchivedVitals), page, pageSize, totalCount };
}

/**
 * One page of archived orders of all three kinds, most recently archived first.
 *
 * Lab, imaging, and medication orders are three tables and one thing to a reader, so
 * this merges them rather than making the screen ask three times. Merging is what
 * makes paging the awkward part: the three lists cannot each serve their own page,
 * because page two of the merged list is not page two of any single table. Each
 * table is therefore read from the start of its archive through the end of the
 * window — `skip + take` rows, which `pageOf` has already clamped — and the merged
 * list then takes the window's slice of them. Reading through the window rather than
 * the whole table is what keeps the second query bounded.
 */
export async function listArchivedOrders(
  query: ArchiveListQuery = {},
): Promise<ArchivePage<ArchivedOrderDto>> {
  await requirePermission(PERMISSIONS.ORDERS_ARCHIVE);

  const { page, pageSize, skip, take } = pageOf(query);
  const through = skip + take;
  const where = ARCHIVED_RECORD;
  const orderBy = MOST_RECENTLY_ARCHIVED;
  const include = { visit: { include: { patient: true } } };

  const [lab, imaging, medication, labCount, imagingCount, medCount] =
    await Promise.all([
      getPrisma().labOrder.findMany({
        where,
        include,
        orderBy,
        take: through,
      }),
      getPrisma().imagingOrder.findMany({
        where,
        include,
        orderBy,
        take: through,
      }),
      getPrisma().medicationOrder.findMany({
        where,
        include: { ...include, medication: true },
        orderBy,
        take: through,
      }),
      getPrisma().labOrder.count({ where }),
      getPrisma().imagingOrder.count({ where }),
      getPrisma().medicationOrder.count({ where }),
    ]);

  const tagged: TaggedArchivedOrder[] = [
    ...lab.map((order) => ({ kind: "LAB" as const, order })),
    ...imaging.map((order) => ({ kind: "IMAGING" as const, order })),
    ...medication.map((order) => ({ kind: "MEDICATION" as const, order })),
  ];

  return {
    rows: tagged
      .sort(mostRecentlyArchivedFirst)
      .slice(skip, through)
      .map(toArchivedOrder),
    page,
    pageSize,
    totalCount: labCount + imagingCount + medCount,
  };
}

/**
 * Newest archive moment first, across the three tables, with the id settling a tie.
 *
 * The same order every archive list uses, and it has to be applied to the merged
 * list rather than to each table's own rows, or the pages would disagree about
 * where a row belongs. An archived row carries a moment by construction; the `?? 0`
 * only keeps a stray row that somehow was not archived at the end of the list
 * instead of failing the sort.
 */
function mostRecentlyArchivedFirst(
  left: TaggedArchivedOrder,
  right: TaggedArchivedOrder,
): number {
  const leftAt = left.order.deletedAt?.getTime() ?? 0;
  const rightAt = right.order.deletedAt?.getTime() ?? 0;

  if (leftAt !== rightAt) return rightAt - leftAt;

  return right.order.id.localeCompare(left.order.id);
}

/**
 * The window a read covers, taken from the clinic days the query names.
 *
 * Both bounds resolve through the clinic's clock, so "the second of March" means
 * the second of March where the clinic is, not where the server happens to run.
 */
function startDateTimeWindow(query: VisitListQuery) {
  const zone = clinicTimeZone();
  const opens = startOfDay(query.from, zone);
  const closes = endOfDay(query.to, zone);

  if (!opens && !closes) return {};

  return {
    startDateTime: {
      ...(opens ? { gte: opens } : {}),
      // Exclusive: the moment the *next* day opens, not the last instant of this
      // one. A visit starting exactly at midnight belongs to the new day.
      ...(closes ? { lt: closes } : {}),
    },
  };
}

function clamp(limit: number | undefined): number {
  if (limit === undefined || Number.isNaN(limit)) return DEFAULT_LIST_LIMIT;

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIST_LIMIT);
}
