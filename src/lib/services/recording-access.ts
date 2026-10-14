import "server-only";
import { db } from "@/lib/db";

export const ACCESS_WINDOW_HOURS = 48;

// A student "missed" a class if their attendance was ABSENT, PARTIAL or EXCUSED. Missing a class
// doesn't change who may watch (everyone in the batch can request any recording), it only lets the
// screen point those students at the recordings they most likely need.
const MISSED_STATUSES = new Set(["ABSENT", "PARTIAL", "EXCUSED"]);

export type RecordingAccessState =
  /** Not requested yet: the student can press Request. */
  | "LOCKED"
  /** Requested, still inside the 48 hours. */
  | "ACTIVE"
  /** The 48 hours have passed. There is no second window. */
  | "EXPIRED";

export interface RecordingAccessInfo {
  state: RecordingAccessState;
  /** Set only while the window is open: when watching stops. */
  activeUntil: Date | null;
  missedClass: boolean;
}

/** Bulk version for a list page: one query per table instead of one per recording. */
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
    const status = r.liveClassId ? statusByLiveClass.get(r.liveClassId) : undefined;
    const missedClass = Boolean(status && MISSED_STATUSES.has(status));
    const access = accessByRecording.get(r.id);
    if (!access) result.set(r.id, { state: "LOCKED", activeUntil: null, missedClass });
    else if (access.expiresAt > now) result.set(r.id, { state: "ACTIVE", activeUntil: access.expiresAt, missedClass });
    else result.set(r.id, { state: "EXPIRED", activeUntil: null, missedClass });
  }
  return result;
}

async function assertInBatch(studentId: string, batchId: string) {
  const member = await db.batchStudent.findFirst({ where: { studentId, batchId }, select: { id: true } });
  if (!member) throw new Error("This recording isn't part of one of your batches.");
}

/**
 * Opens the 48-hour window for a student. Any student in the recording's batch may ask, whether or
 * not they attended. The window runs from the moment they ask and is the only one: once it has
 * passed the recording stays locked for that student (a teacher can clear it, see
 * resetRecordingAccess).
 */
export async function requestRecordingAccess(studentId: string, recordingId: string) {
  const recording = await db.classRecording.findUniqueOrThrow({ where: { id: recordingId } });
  await assertInBatch(studentId, recording.batchId);

  const existing = await db.recordingAccessRequest.findUnique({ where: { recordingId_studentId: { recordingId, studentId } } });
  if (existing) {
    if (existing.expiresAt > new Date()) return existing;
    throw new Error("Your 48 hours for this recording have ended. Ask your teacher if you need it again.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ACCESS_WINDOW_HOURS * 60 * 60 * 1000);
  try {
    return await db.recordingAccessRequest.create({ data: { recordingId, studentId, requestedAt: now, expiresAt } });
  } catch (err) {
    // Two taps at once: the second one finds the first one's window instead of failing.
    const again = await db.recordingAccessRequest.findUnique({ where: { recordingId_studentId: { recordingId, studentId } } });
    if (again) return again;
    throw err;
  }
}

/** When this student's window closes, or null when they may not watch right now. */
export async function getActiveAccessExpiry(studentId: string, recordingId: string): Promise<Date | null> {
  const access = await db.recordingAccessRequest.findUnique({ where: { recordingId_studentId: { recordingId, studentId } } });
  return access && access.expiresAt > new Date() ? access.expiresAt : null;
}

/** For a teacher or admin: lets one student request a recording again. */
export async function resetRecordingAccess(recordingId: string, studentId: string) {
  await db.recordingAccessRequest.deleteMany({ where: { recordingId, studentId } });
}
