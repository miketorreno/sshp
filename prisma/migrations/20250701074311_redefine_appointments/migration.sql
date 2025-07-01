/*
  Warnings:

  - You are about to drop the column `durationMins` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledTime` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Appointment` table. All the data in the column will be lost.
  - Added the required column `appointmentType` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endDateTime` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDateTime` to the `Appointment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('Admission', 'CLINIC', 'EMERGENCY', 'FOLLOWUP', 'IMAGING', 'LAB', 'PHARMACY');

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_providerId_fkey";

-- DropIndex
DROP INDEX "Appointment_patientId_providerId_appointmentId_idx";

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "durationMins",
DROP COLUMN "scheduledTime",
DROP COLUMN "status",
ADD COLUMN     "appointmentStatus" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN     "appointmentType" "AppointmentType" NOT NULL,
ADD COLUMN     "endDateTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startDateTime" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "providerId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Appointment_patientId_providerId_idx" ON "Appointment"("patientId", "providerId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
