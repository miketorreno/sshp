/*
  Warnings:

  - You are about to drop the column `labType` on the `ImagingOrder` table. All the data in the column will be lost.
  - You are about to drop the column `imagingType` on the `LabOrder` table. All the data in the column will be lost.
  - Added the required column `imagingType` to the `ImagingOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `labType` to the `LabOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ImagingOrder" DROP COLUMN "labType",
ADD COLUMN     "imagingType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "LabOrder" DROP COLUMN "imagingType",
ADD COLUMN     "labType" TEXT NOT NULL;
