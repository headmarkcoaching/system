-- A recording can now be a video stored in Google Drive (driveFileId) instead of a pasted link.
ALTER TABLE "class_recordings" ALTER COLUMN "recordingUrl" DROP NOT NULL;
ALTER TABLE "class_recordings" ADD COLUMN "driveFileId" TEXT;
ALTER TABLE "class_recordings" ADD COLUMN "mimeType" TEXT;
ALTER TABLE "class_recordings" ADD COLUMN "sizeBytes" INTEGER;
CREATE UNIQUE INDEX "class_recordings_driveFileId_key" ON "class_recordings"("driveFileId");
