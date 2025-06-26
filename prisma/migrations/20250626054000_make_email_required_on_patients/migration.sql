/*
  Warnings:

  - Made the column `email` on table `Patient` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Patient" ALTER COLUMN "email" SET NOT NULL;
