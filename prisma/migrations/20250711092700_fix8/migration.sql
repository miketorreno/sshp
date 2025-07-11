/*
  Warnings:

  - You are about to drop the column `bloodPressureDiastolic` on the `Vitals` table. All the data in the column will be lost.
  - You are about to drop the column `bloodPressureSystolic` on the `Vitals` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Vitals" DROP COLUMN "bloodPressureDiastolic",
DROP COLUMN "bloodPressureSystolic",
ADD COLUMN     "diastolicBP" INTEGER,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "systolicBP" INTEGER,
ADD COLUMN     "weight" INTEGER;
