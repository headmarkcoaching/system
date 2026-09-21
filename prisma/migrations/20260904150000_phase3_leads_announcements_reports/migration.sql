-- AlterTable
ALTER TABLE "communication_logs" ADD COLUMN     "studentId" TEXT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "convertedStudentId" TEXT;

-- CreateIndex
CREATE INDEX "communication_logs_studentId_idx" ON "communication_logs"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_convertedStudentId_key" ON "leads"("convertedStudentId");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_convertedStudentId_fkey" FOREIGN KEY ("convertedStudentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
