/**
 * Writing to the archive/restore event log. The database refuses to update or
 * delete a logged event, so the only thing a command can do here is append.
 */

import type { ArchiveRestoreEvent, Prisma } from "@/generated/prisma";

/** The record types the log can name, as the domain names them. */
export type ArchivableRecordType = ArchiveRestoreEvent["recordType"];

/** One event, as a command knows it before it becomes a row. */
export type ArchiveEvent = {
  action: ArchiveRestoreEvent["action"];
  recordType: ArchivableRecordType;
  recordId: string;
  actorId: string;
  occurredAt?: Date;
};

/**
 * Appends one event to the log. Every archive and restore comes through here, in
 * the transaction that changes `deletedAt`, so no record can be archived without
 * its history admitting it and no history can claim an archive that did not
 * happen.
 */
export async function appendArchiveEvent(
  tx: Prisma.TransactionClient,
  event: ArchiveEvent,
): Promise<void> {
  await tx.archiveRestoreEvent.create({
    data: {
      action: event.action,
      recordType: event.recordType,
      recordId: event.recordId,
      actorId: event.actorId,
      occurredAt: event.occurredAt ?? new Date(),
    },
  });
}
