/*
  Warnings:

  - The values [INPATIENT,OUTPATIENT] on the enum `VisitType` will be removed. If these variants are still used in the database, this will fail.
  - The `patientType` column on the `Patient` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[email]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PatientType" AS ENUM ('INPATIENT', 'OUTPATIENT');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PATIENT';

-- AlterEnum
BEGIN;
CREATE TYPE "VisitType_new" AS ENUM ('CLINIC', 'EMERGENCY', 'FOLLOWUP', 'IMAGING', 'LAB', 'PHARMACY');
ALTER TABLE "Visit" ALTER COLUMN "visitType" TYPE "VisitType_new" USING ("visitType"::text::"VisitType_new");
ALTER TYPE "VisitType" RENAME TO "VisitType_old";
ALTER TYPE "VisitType_new" RENAME TO "VisitType";
DROP TYPE "VisitType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "patientType",
ADD COLUMN     "patientType" "PatientType" NOT NULL DEFAULT 'OUTPATIENT';

-- CreateIndex
CREATE UNIQUE INDEX "Patient_email_key" ON "Patient"("email");
