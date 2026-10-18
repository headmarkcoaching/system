import "server-only";
import { db } from "@/lib/db";
import { combineDateAndTime, formatTime } from "@/lib/utils";
import { createZoomClassMeeting, deleteZoomMeeting } from "@/lib/zoom/meetings";
import type { LiveClass } from "@prisma/client";

/** What a Zoom-run class stores in `meetingLink`. The shared link is never kept or shown. */
export const ZOOM_MANAGED_LINK = "zoom://managed";

/** Minutes the host needs between two classes (to end one meeting and start the next). */
export const ZOOM_CLASS_BUFFER_MINUTES = 5;

export class ZoomScheduleError extends Error {}

export interface ZoomClassInput {
  title: string;
  subjectId: string;
  chapter?: string;
  batchId: string;
  teacherId: string;
  /** "YYYY-MM-DD" */
  scheduledDate: string;
  /** "HH:mm", Pakistan time */
  startTime: string;
  endTime: string;
  createdById: string;
}

/**
 * With one Zoom host licence only one meeting can run at a time. This finds a Zoom class that would
 * overlap the proposed one (allowing a short gap for changeover), so scheduling can refuse it up front
 * instead of two classes colliding on the day.
 */
export async function findZoomConflict(input: { scheduledDate: string; startTime: string; endTime: string; excludeClassId?: string }) {
  const day = new Date(input.scheduledDate);
  const start = combineDateAndTime(day, input.startTime).getTime();
  const end = combineDateAndTime(day, input.endTime).getTime();
  const buffer = ZOOM_CLASS_BUFFER_MINUTES * 60_000;

  const nearby = await db.liveClass.findMany({
    where: {
      zoomMeetingId: { not: null },
      status: { not: "CANCELLED" },
      id: input.excludeClassId ? { not: input.excludeClassId } : undefined,
      scheduledDate: { gte: new Date(day.getTime() - 24 * 3600_000), lte: new Date(day.getTime() + 24 * 3600_000) },
    },
    include: { batch: { select: { name: true } } },
  });

  for (const c of nearby) {
    const cStart = combineDateAndTime(c.scheduledDate, c.startTime).getTime();
    const cEnd = combineDateAndTime(c.scheduledDate, c.endTime).getTime();
    if (start < cEnd + buffer && cStart < end + buffer) return c;
  }
  return null;
}

/**
 * Schedules a live class on Zoom: refuses an overlap, creates the secure meeting, then saves the class.
 * If saving fails after the meeting exists, the meeting is removed again so nothing is left behind.
 */
export async function createZoomLiveClass(input: ZoomClassInput): Promise<LiveClass> {
  if (!/^\d{2}:\d{2}$/.test(input.startTime) || !/^\d{2}:\d{2}$/.test(input.endTime)) throw new ZoomScheduleError("Enter the times like 16:00.");
  const day = new Date(input.scheduledDate);
  if (Number.isNaN(day.getTime())) throw new ZoomScheduleError("Enter the date like 2026-10-20.");
  const startAt = combineDateAndTime(day, input.startTime);
  const endAt = combineDateAndTime(day, input.endTime);
  if (endAt <= startAt) throw new ZoomScheduleError("The class must end after it starts.");

  const clash = await findZoomConflict(input);
  if (clash) {
    throw new ZoomScheduleError(
      `Another Zoom class is already booked then: "${clash.title}" (${clash.batch.name}), ${formatTime(clash.startTime)} to ${formatTime(clash.endTime)}. ` +
        `Your Zoom plan runs one class at a time, so choose a time that doesn't overlap (leave ${ZOOM_CLASS_BUFFER_MINUTES} minutes between classes).`
    );
  }

  const batch = await db.batch.findUnique({ where: { id: input.batchId }, select: { name: true } });
  const { meetingId } = await createZoomClassMeeting({
    topic: `${input.title} — ${batch?.name ?? "Head Mark Coaching"}`,
    startLocal: `${input.scheduledDate}T${input.startTime}:00`,
    durationMinutes: Math.round((endAt.getTime() - startAt.getTime()) / 60_000),
  });

  try {
    return await db.liveClass.create({
      data: {
        title: input.title,
        subjectId: input.subjectId,
        chapter: input.chapter || undefined,
        batchId: input.batchId,
        teacherId: input.teacherId,
        scheduledDate: day,
        startTime: input.startTime,
        endTime: input.endTime,
        meetingProvider: "ZOOM",
        meetingLink: ZOOM_MANAGED_LINK,
        zoomMeetingId: meetingId,
        createdById: input.createdById,
      },
    });
  } catch (err) {
    await deleteZoomMeeting(meetingId).catch((e) => console.error("Couldn't remove the Zoom meeting after a failed save", e));
    throw err;
  }
}

/** Called when a Zoom class is cancelled: removes the meeting in Zoom. Never throws. */
export async function releaseZoomMeeting(zoomMeetingId: string | null | undefined) {
  if (!zoomMeetingId) return;
  try {
    await deleteZoomMeeting(zoomMeetingId);
  } catch (err) {
    console.error("Zoom meeting delete failed", err);
  }
}
