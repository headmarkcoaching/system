-- AlterEnum
ALTER TYPE "FilePurpose" ADD VALUE 'LEAD_ASSESSMENT';

-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "documentFileId" TEXT;
