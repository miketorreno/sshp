/*
  The check-in link lives in one direction: a visit holds the appointment that
  opened it. `Appointment.appointmentId` was a second, mirror copy of that link
  which nothing ever wrote or read, so it could disagree with the visit table
  without anything noticing. It is dropped, and `Visit.appointmentId` — which the
  check-in command already writes and every read already asks — becomes the
  foreign key it was always meant to be.
*/
-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_appointmentId_fkey";

-- DropIndex
DROP INDEX "Appointment_appointmentId_key";

-- DropColumn
ALTER TABLE "Appointment" DROP COLUMN "appointmentId";

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;