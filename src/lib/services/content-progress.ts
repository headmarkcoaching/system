import "server-only";
import { db } from "@/lib/db";
import type { ContentKind } from "@prisma/client";

const COMPLETE_THRESHOLD_PERCENT = 90;

/** A URL the browser can embed as a real <video src> and get real timeupdate events from —
 * a direct file link, not a Drive/YouTube/Zoom share link that only opens in a new tab.
 * Recordings/study material use plain pasted URLs (see Known Issues), so most seeded/demo
 * links won't match this — that's expected, not a bug; the manual "Mark Complete" fallback
 * covers everything else honestly. */
export function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

export function getContentProgress(studentId: string, contentKind: ContentKind, contentId: string) {
  return db.contentProgress.findUnique({ where: { studentId_contentKind_contentId: { studentId, contentKind, contentId } } });
}

export function listContentProgressForStudent(studentId: string, contentKind?: ContentKind) {
  return db.contentProgress.findMany({ where: { studentId, contentKind } });
}

/** Called on real <video> timeupdate events (throttled client-side) for directly embeddable
 * recordings — this is genuine automatic tracking, not a self-report. */
export async function recordVideoProgress(studentId: string, recordingId: string, positionSeconds: number, durationSeconds: number) {
  const completionPercent = durationSeconds > 0 ? Math.min(100, Math.round((positionSeconds / durationSeconds) * 100)) : 0;
  const completed = completionPercent >= COMPLETE_THRESHOLD_PERCENT;

  return db.contentProgress.upsert({
    where: { studentId_contentKind_contentId: { studentId, contentKind: "RECORDING", contentId: recordingId } },
    update: { lastPositionSeconds: Math.round(positionSeconds), completionPercent, completed, completedAt: completed ? new Date() : undefined },
    create: {
      studentId,
      contentKind: "RECORDING",
      contentId: recordingId,
      lastPositionSeconds: Math.round(positionSeconds),
      completionPercent,
      completed,
      completedAt: completed ? new Date() : undefined,
    },
  });
}

/** Manual self-report fallback — used for recordings whose URL can't be embedded/measured
 * (Drive/YouTube/Zoom links, the overwhelming majority today), and always for study material
 * since there's no way to detect whether a student actually read a PDF/notes link. */
export async function markContentComplete(studentId: string, contentKind: ContentKind, contentId: string) {
  return db.contentProgress.upsert({
    where: { studentId_contentKind_contentId: { studentId, contentKind, contentId } },
    update: { completionPercent: 100, completed: true, completedAt: new Date() },
    create: { studentId, contentKind, contentId, completionPercent: 100, completed: true, completedAt: new Date() },
  });
}
