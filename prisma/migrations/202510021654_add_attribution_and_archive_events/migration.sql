/*
  An archive that leaves no trace is indistinguishable from a mistake, and a
  history that can be edited afterwards is not a history. So every archive and
  every restore appends one row to `ArchiveRestoreEvent` naming the record, the
  colleague who acted and the instant — inside the same transaction as the
  `deletedAt` change, so the log can never disagree with the records it describes.

  The log is append-only in the database, not merely in the application: a
  trigger refuses any update or delete, because a caller with a Prisma client is
  exactly the kind of caller that would otherwise quietly correct the past.

  Patients and appointments gain the staff member who created and last edited
  them, so a record answers "who did this" without a log search. The columns are
  nullable so rows written before this migration keep their history; every
  command from here on fills them in.
*/
-- CreateEnum
CREATE TYPE "ArchiveEventAction" AS ENUM ('ARCHIVE', 'RESTORE');

-- CreateEnum
CREATE TYPE "ArchiveRecordType" AS ENUM ('Patient', 'Appointment', 'Visit', 'Vitals', 'LabOrder', 'ImagingOrder', 'MedicationOrder');

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "updatedById" TEXT;

-- CreateTable
CREATE TABLE "ArchiveRestoreEvent" (
    "id" TEXT NOT NULL,
    "action" "ArchiveEventAction" NOT NULL,
    "recordType" "ArchiveRecordType" NOT NULL,
    "recordId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchiveRestoreEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchiveRestoreEvent_recordType_recordId_occurredAt_idx" ON "ArchiveRestoreEvent"("recordType", "recordId", "occurredAt");

-- CreateIndex
CREATE INDEX "ArchiveRestoreEvent_actorId_occurredAt_idx" ON "ArchiveRestoreEvent"("actorId", "occurredAt");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveRestoreEvent" ADD CONSTRAINT "ArchiveRestoreEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Make the log append-only in the database, not only in the code that writes it.
CREATE FUNCTION "reject_archive_restore_event_mutation"() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'ArchiveRestoreEvent is append-only: % is refused', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ArchiveRestoreEvent_is_append_only"
    BEFORE UPDATE OR DELETE ON "ArchiveRestoreEvent"
    FOR EACH ROW EXECUTE FUNCTION "reject_archive_restore_event_mutation"();

-- TRUNCATE fires no row trigger, so it is refused by one of its own rather than
-- left as the one way to empty the log.
CREATE TRIGGER "ArchiveRestoreEvent_is_append_only_truncate"
    BEFORE TRUNCATE ON "ArchiveRestoreEvent"
    FOR EACH STATEMENT EXECUTE FUNCTION "reject_archive_restore_event_mutation"();