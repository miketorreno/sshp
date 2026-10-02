/**
 * The archive/restore event log, shared by every record type that can be
 * archived. An event is a plain fact about one record's lifecycle: what happened,
 * who did it, and the instant it happened.
 */

import type { ArchiveRestoreEvent } from "@/generated/prisma";

/**
 * Oldest first, because the order events happened in is the whole point of a
 * history: a reader looking at one record's lifecycle needs to see the archive
 * before the restore that undid it, not two rows in whatever order the database
 * returned them. `occurredAt` ties when two events land in the same millisecond,
 * so the id settles it. A cuid opens with its own timestamp and a per-process
 * counter, so ordering by it is chronological for the events this app writes.
 */
export const CHRONOLOGICAL = { occurredAt: "asc", id: "asc" } as const;

export type ArchiveEventDto = {
  id: string;
  action: ArchiveRestoreEvent["action"];
  recordType: ArchiveRestoreEvent["recordType"];
  recordId: string;
  actorId: string;
  occurredAt: string;
};

export function toArchiveEvent(event: ArchiveRestoreEvent): ArchiveEventDto {
  return {
    id: event.id,
    action: event.action,
    recordType: event.recordType,
    recordId: event.recordId,
    actorId: event.actorId,
    occurredAt: event.occurredAt.toISOString(),
  };
}
