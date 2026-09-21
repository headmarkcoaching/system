-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'PARTIAL';

-- AlterEnum
ALTER TYPE "AutomationRuleKey" ADD VALUE 'ATTENDANCE_AUTO_DETECT';

-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "isAutoDetected" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "live_class_presence" (
    "id" TEXT NOT NULL,
    "liveClassId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastPingAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_class_presence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "live_class_presence_liveClassId_studentId_key" ON "live_class_presence"("liveClassId", "studentId");

-- AddForeignKey
ALTER TABLE "live_class_presence" ADD CONSTRAINT "live_class_presence_liveClassId_fkey" FOREIGN KEY ("liveClassId") REFERENCES "live_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_class_presence" ADD CONSTRAINT "live_class_presence_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
