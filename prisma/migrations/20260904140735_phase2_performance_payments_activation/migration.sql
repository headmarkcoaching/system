-- CreateTable
CREATE TABLE "participation_scores" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participation_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_config" (
    "id" TEXT NOT NULL,
    "attendanceWeight" INTEGER NOT NULL DEFAULT 20,
    "homeworkWeight" INTEGER NOT NULL DEFAULT 20,
    "testWeight" INTEGER NOT NULL DEFAULT 40,
    "participationWeight" INTEGER NOT NULL DEFAULT 20,
    "excellentThreshold" INTEGER NOT NULL DEFAULT 85,
    "progressingThreshold" INTEGER NOT NULL DEFAULT 70,
    "needsAttentionThreshold" INTEGER NOT NULL DEFAULT 50,
    "atRiskAttendanceBelow" INTEGER NOT NULL DEFAULT 60,
    "atRiskHomeworkBelow" INTEGER NOT NULL DEFAULT 50,
    "atRiskTestBelow" INTEGER NOT NULL DEFAULT 40,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "performance_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "participation_scores_studentId_idx" ON "participation_scores"("studentId");

-- CreateIndex
CREATE INDEX "tests_batchId_idx" ON "tests"("batchId");

-- CreateIndex
CREATE INDEX "tests_status_idx" ON "tests"("status");

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "academic_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation_scores" ADD CONSTRAINT "participation_scores_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation_scores" ADD CONSTRAINT "participation_scores_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
