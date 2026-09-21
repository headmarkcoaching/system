-- CreateEnum
CREATE TYPE "ContentKind" AS ENUM ('RECORDING', 'STUDY_MATERIAL');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('WEEKLY', 'MONTHLY', 'EXAM');

-- CreateEnum
CREATE TYPE "GoalMetric" AS ENUM ('SUBJECT_TEST_SCORE', 'OVERALL_PERFORMANCE', 'ATTENDANCE', 'HOMEWORK_COMPLETION');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'MISSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "content_progress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "contentKind" "ContentKind" NOT NULL,
    "contentId" TEXT NOT NULL,
    "lastPositionSeconds" INTEGER NOT NULL DEFAULT 0,
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_goals" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "GoalType" NOT NULL,
    "metric" "GoalMetric" NOT NULL,
    "subjectId" TEXT,
    "title" TEXT NOT NULL,
    "startValue" DOUBLE PRECISION NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_progress_studentId_idx" ON "content_progress"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "content_progress_studentId_contentKind_contentId_key" ON "content_progress"("studentId", "contentKind", "contentId");

-- CreateIndex
CREATE INDEX "student_goals_studentId_idx" ON "student_goals"("studentId");

-- CreateIndex
CREATE INDEX "student_goals_status_idx" ON "student_goals"("status");

-- AddForeignKey
ALTER TABLE "content_progress" ADD CONSTRAINT "content_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_goals" ADD CONSTRAINT "student_goals_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_goals" ADD CONSTRAINT "student_goals_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_goals" ADD CONSTRAINT "student_goals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
