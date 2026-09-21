-- CreateTable
CREATE TABLE "recording_access_requests" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recording_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recording_access_requests_recordingId_studentId_key" ON "recording_access_requests"("recordingId", "studentId");

-- AddForeignKey
ALTER TABLE "recording_access_requests" ADD CONSTRAINT "recording_access_requests_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "class_recordings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recording_access_requests" ADD CONSTRAINT "recording_access_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
