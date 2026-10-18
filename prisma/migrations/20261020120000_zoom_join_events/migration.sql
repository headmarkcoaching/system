-- Who actually joined each Zoom class, so shared or unexpected joiners can be spotted.
CREATE TYPE "ZoomJoinKind" AS ENUM ('EXPECTED', 'DUPLICATE', 'UNKNOWN', 'REVOKED');

CREATE TABLE "zoom_join_events" (
    "id" TEXT NOT NULL,
    "liveClassId" TEXT NOT NULL,
    "studentId" TEXT,
    "participantUuid" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "kind" "ZoomJoinKind" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zoom_join_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "zoom_join_events_liveClassId_participantUuid_joinedAt_key" ON "zoom_join_events"("liveClassId", "participantUuid", "joinedAt");
CREATE INDEX "zoom_join_events_kind_createdAt_idx" ON "zoom_join_events"("kind", "createdAt");

ALTER TABLE "zoom_join_events" ADD CONSTRAINT "zoom_join_events_liveClassId_fkey" FOREIGN KEY ("liveClassId") REFERENCES "live_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
