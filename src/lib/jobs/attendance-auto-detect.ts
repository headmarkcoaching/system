import "server-only";
import { db } from "@/lib/db";
import * as automationService from "@/lib/services/automation";
import { combineDateAndTime } from "@/lib/utils";

const FINALIZE_BUFFER_MINUTES = 15;
const LOOKBACK_DAYS = 3;
const PRESENT_THRESHOLD = 0.8;
const PARTIAL_THRESHOLD = 0.5;

/**
 * Finalizes the free tab-heartbeat presence estimate (LiveClassPresence.activeSeconds,
 * accumulated while a student's dashboard pings during a LIVE class) into real Attendance
 * rows, once a class's scheduled window has passed. Presence is a proxy for "tab open and
 * active" — not proof of actually watching the external Google Meet — so every row this
 * job creates is flagged isAutoDetected and only fills students with no Attendance row yet;
 * it never overwrites a teacher's own mark (manual or from a prior run of this job).
 */
export async function runAttendanceAutoDetect() {
  const now = new Date();
  const lookbackStart = new Date(now);
  lookbackStart.setDate(lookbackStart.getDate() - LOOKBACK_DAYS);

  const candidateClasses = await db.liveClass.findMany({
    where: { status: { not: "CANCELLED" }, scheduledDate: { gte: lookbackStart, lte: now } },
    include: { batch: { include: { students: true } }, presence: true },
  });

  let processed = 0;
  for (const liveClass of candidateClasses) {
    const endAt = combineDateAndTime(liveClass.scheduledDate, liveClass.endTime);
    const finalizeAt = new Date(endAt.getTime() + FINALIZE_BUFFER_MINUTES * 60_000);
    if (now < finalizeAt) continue;

    const startAt = combineDateAndTime(liveClass.scheduledDate, liveClass.startTime);
    const totalSeconds = Math.max(1, Math.round((endAt.getTime() - startAt.getTime()) / 1000));

    const existing = await db.attendance.findMany({ where: { liveClassId: liveClass.id }, select: { studentId: true } });
    const existingStudentIds = new Set(existing.map((a) => a.studentId));
    const presenceByStudent = new Map(liveClass.presence.map((p) => [p.studentId, p.activeSeconds]));

    for (const enrollment of liveClass.batch.students) {
      if (existingStudentIds.has(enrollment.studentId)) continue;
      const activeSeconds = presenceByStudent.get(enrollment.studentId) ?? 0;
      const percent = activeSeconds / totalSeconds;
      const status = percent >= PRESENT_THRESHOLD ? "PRESENT" : percent >= PARTIAL_THRESHOLD ? "PARTIAL" : "ABSENT";

      await db.attendance.create({
        data: {
          studentId: enrollment.studentId,
          liveClassId: liveClass.id,
          batchId: liveClass.batchId,
          subjectId: liveClass.subjectId,
          date: liveClass.scheduledDate,
          status,
          isAutoDetected: true,
        },
      });
      processed += 1;
    }
  }

  await automationService.logAutomation({
    ruleKey: "ATTENDANCE_AUTO_DETECT",
    action: `Auto-detected attendance for ${processed} student-class pairs`,
    details: { count: processed },
  });

  return { processed };
}
