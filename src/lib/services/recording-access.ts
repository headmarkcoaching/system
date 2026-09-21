import "server-only";
import { db } from "@/lib/db";

const ACCESS_WINDOW_HOURS = 48;

// A student "missed" a class for recording-access purposes if their attendance was ABSENT,
// PARTIAL, or EXCUSED — someone who was PRESENT or LATE already had the live experience, and a
// class with no attendance record yet (not marked/auto-detected) is deliberately treated as not
// eligible rather than defaulting open, since we can't yet confirm they actually missed it.
const MISSED_STATUSES = new Set(["ABSENT", "PARTIAL", "EXCUSED"]);

export interface RecordingAccessInfo {
  /** Legacy recording with no linked LiveClass — no eligibility signal exists, so it stays open. */
  isLinked: boolean;
  eligible: boolean;
  /** Set only while an unexpired request exists — the recording is watchable until this time. */
  activeUntil: Date | null;
}

/** Bulk version for a list page — one query per table instead of one per recording. */
export async function getRecordingAccessMap(
  studentId: string,
  recordings: { id: string; liveClassId: string | null }[]
): Promise<Map<string, RecordingAccessInfo>> {
  const liveClassIds = recordings.map((r) => r.liveClassId).filter((id): id is string => Boolean(id));

  const [attendanceRows, accessRows] = await Promise.all([
    liveClassIds.length
      ? db.attendance.findMany({ where: { studentId, liveClassId: { in: liveClassIds } }, select: { liveClassId: true, status: true } })
      : Promise.resolve([]),
    db.recordingAccessRequest.findMany({ where: { studentId, recordingId: { in: recordings.map((r) => r.id) } } }),
  ]);

  const statusByLiveClass = new Map(attendanceRows.map((a) => [a.liveClassId, a.status]));
  const accessByRecording = new Map(accessRows.map((a) => [a.recordingId, a]));
  const now = new Date();

  const result = new Map<string, RecordingAccessInfo>();
  for (const r of recordings) {
    if (!r.liveClassId) {
      result.set(r.id, { isLinked: false, eligible: false, activeUntil: null });
      continue;
    }
    const status = statusByLiveClass.get(r.liveClassId);
    const eligible = Boolean(status && MISSED_STATUSES.has(status));
    const access = accessByRecording.get(r.id);
    const activeUntil = access && access.expiresAt > now ? access.expiresAt : null;
    result.set(r.id, { isLinked: true, eligible, activeUntil });
  }
  return result;
}

export async function requestRecordingAccess(studentId: string, recordingId: string) {
  const recording = await db.classRecording.findUniqueOrThrow({ where: { id: recordingId } });
  if (!recording.liveClassId) {
    throw new Error("This recording doesn't need to be requested.");
  }
  const attendance = await db.attendance.findUnique({
    where: { studentId_liveClassId: { studentId, liveClassId: recording.liveClassId } },
  });
  if (!attendance || !MISSED_STATUSES.has(attendance.status)) {
    throw new Error("You can only request a recording for a live class you missed.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ACCESS_WINDOW_HOURS * 60 * 60 * 1000);
  return db.recordingAccessRequest.upsert({
    where: { recordingId_studentId: { recordingId, studentId } },
    update: { requestedAt: now, expiresAt },
    create: { recordingId, studentId, requestedAt: now, expiresAt },
  });
}
