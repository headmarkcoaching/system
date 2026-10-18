-- To-do list for copying finished Zoom recordings into Google Drive.
CREATE TYPE "ZoomRecordingJobStatus" AS ENUM ('PENDING', 'COPYING', 'DONE', 'FAILED', 'SKIPPED');

CREATE TABLE "zoom_recording_jobs" (
    "id" TEXT NOT NULL,
    "meetingUuid" TEXT NOT NULL,
    "zoomMeetingId" TEXT NOT NULL,
    "liveClassId" TEXT,
    "status" "ZoomRecordingJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "files" JSONB NOT NULL,
    "downloadTokenEnc" TEXT,
    "classRecordingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "zoom_recording_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "zoom_recording_jobs_meetingUuid_key" ON "zoom_recording_jobs"("meetingUuid");
CREATE INDEX "zoom_recording_jobs_status_nextAttemptAt_idx" ON "zoom_recording_jobs"("status", "nextAttemptAt");

ALTER TABLE "zoom_recording_jobs" ADD CONSTRAINT "zoom_recording_jobs_liveClassId_fkey" FOREIGN KEY ("liveClassId") REFERENCES "live_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
