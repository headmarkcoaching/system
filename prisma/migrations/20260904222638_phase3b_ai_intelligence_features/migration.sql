-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AIInteractionFeature" ADD VALUE 'PERFORMANCE_ANALYSIS';
ALTER TYPE "AIInteractionFeature" ADD VALUE 'STUDY_PLAN';
ALTER TYPE "AIInteractionFeature" ADD VALUE 'PARENT_REPORT_DRAFT';
ALTER TYPE "AIInteractionFeature" ADD VALUE 'TEACHER_ASSISTANT';
ALTER TYPE "AIInteractionFeature" ADD VALUE 'QUESTION_GENERATION';

-- AlterTable
ALTER TABLE "parent_reports" ADD COLUMN     "aiDrafted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT;
