/*
  Warnings:

  - You are about to drop the column `orderType` on the `ImagingOrder` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `ImagingOrder` table. All the data in the column will be lost.
  - You are about to drop the column `report` on the `ImagingOrder` table. All the data in the column will be lost.
  - Added the required column `labType` to the `ImagingOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imagingType` to the `LabOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPERUSER';

-- AlterTable
ALTER TABLE "ImagingOrder" DROP COLUMN "orderType",
DROP COLUMN "reason",
DROP COLUMN "report",
ADD COLUMN     "labType" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "result" TEXT;

-- AlterTable
ALTER TABLE "LabOrder" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "imagingType" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "result" TEXT;
