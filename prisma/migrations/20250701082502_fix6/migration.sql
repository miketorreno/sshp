/*
  Warnings:

  - The values [Admission] on the enum `AppointmentType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AppointmentType_new" AS ENUM ('ADMISSION', 'CLINIC', 'EMERGENCY', 'FOLLOWUP', 'IMAGING', 'LAB', 'PHARMACY');
ALTER TABLE "Appointment" ALTER COLUMN "appointmentType" TYPE "AppointmentType_new" USING ("appointmentType"::text::"AppointmentType_new");
ALTER TYPE "AppointmentType" RENAME TO "AppointmentType_old";
ALTER TYPE "AppointmentType_new" RENAME TO "AppointmentType";
DROP TYPE "AppointmentType_old";
COMMIT;
