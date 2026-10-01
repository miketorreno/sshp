import { getPrisma } from "@/lib/prisma";
import { clinicTimeZone, endOfDay, startOfDay } from "@/lib/clinic-time";
import { PERMISSIONS, requirePermission } from "@/server/access";
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  type VisitListQuery,
} from "./contract";
import {
  toVisitDetail,
  toVisitSummary,
  type VisitDetailDto,
  type VisitSummaryDto,
} from "./dto";

/**
 * Visit reads for staff screens. Every read requires a session that holds
 * `visits:read`, and every read hides archived records: an archived visit is history, a visit whose patient is
 * archived is inactive rather than active, and a record archived inside a visit
 * leaves the visit it was recorded during.
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
