-- One student's personal registration for one Zoom class (the join link is stored encrypted).
CREATE TABLE "zoom_registrations" (
    "id" TEXT NOT NULL,
    "liveClassId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "registrantId" TEXT NOT NULL,
    "joinUrlEnc" TEXT NOT NULL,
    "variant" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "zoom_registrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "zoom_registrations_liveClassId_studentId_key" ON "zoom_registrations"("liveClassId", "studentId");
CREATE INDEX "zoom_registrations_studentId_idx" ON "zoom_registrations"("studentId");

ALTER TABLE "zoom_registrations" ADD CONSTRAINT "zoom_registrations_liveClassId_fkey" FOREIGN KEY ("liveClassId") REFERENCES "live_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "zoom_registrations" ADD CONSTRAINT "zoom_registrations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
