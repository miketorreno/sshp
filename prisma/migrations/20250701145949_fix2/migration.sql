/*
  Warnings:

  - You are about to drop the column `patientStatus` on the `Patient` table. All the data in the column will be lost.
  - Made the column `patientType` on table `Patient` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "patientStatus",
ALTER COLUMN "patientType" SET NOT NULL;
