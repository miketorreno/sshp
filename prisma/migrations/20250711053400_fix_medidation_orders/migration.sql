-- DropForeignKey
ALTER TABLE "MedicationOrder" DROP CONSTRAINT "MedicationOrder_medicationId_fkey";

-- AlterTable
ALTER TABLE "MedicationOrder" ADD COLUMN     "completedAt" TIMESTAMP(3),
ALTER COLUMN "medicationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "MedicationOrder" ADD CONSTRAINT "MedicationOrder_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
