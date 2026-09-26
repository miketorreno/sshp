import prisma from "@/lib/prisma";
import { endOfDay, startOfDay } from "@/lib/clinic-day";
import { requireSession } from "@/lib/session";
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
 * Visit reads for staff screens. Every read requires a session, and every read
 * hides archived records: an archived visit is history, a visit whose patient is
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
  await requireSession();

  const visits = await prisma.visit.findMany({
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
  await requireSession();

  const visit = await prisma.visit.findFirst({
    where: { id, ...ACTIVE_VISIT },
    include: VISIT_DETAIL_RELATIONS,
  });

  if (!visit) return null;

  return toVisitDetail(visit);
}

/** The window a read covers, taken from the days the query names. */
function startDateTimeWindow(query: VisitListQuery) {
  const first = startOfDay(query.from);
  const last = startOfDay(query.to);

  if (!first && !last) return {};

  return {
    startDateTime: {
      ...(first ? { gte: first } : {}),
      ...(last ? { lt: endOfDay(last) } : {}),
    },
  };
}

function clamp(limit: number | undefined): number {
  if (limit === undefined || Number.isNaN(limit)) return DEFAULT_LIST_LIMIT;

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIST_LIMIT);
}
