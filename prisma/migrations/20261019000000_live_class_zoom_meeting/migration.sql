-- A live class can run on a Zoom meeting created by the app.
ALTER TABLE "live_classes" ADD COLUMN "zoomMeetingId" TEXT;
CREATE UNIQUE INDEX "live_classes_zoomMeetingId_key" ON "live_classes"("zoomMeetingId");
