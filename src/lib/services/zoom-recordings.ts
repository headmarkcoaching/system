import "server-only";
import type { Prisma, ZoomRecordingJob } from "@prisma/client";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { combineDateAndTime } from "@/lib/utils";
import { GoogleDriveStorageProvider } from "@/lib/storage/providers/google-drive-provider";
import { openZoomRecordingDownload, deleteZoomMeetingRecordings, isZoomDownloadUrl } from "@/lib/zoom/recordings";

/**
 * Recordings, end to end: Zoom records the class in its cloud and tells us (webhook) when the file is
 * ready; we stream it straight from Zoom into the academy's private Google Drive, check the copy is
 * complete, register it as the class's recording, and only then delete it from Zoom. Nothing is ever
 * saved on a teacher's computer or on this server.
 *
 * Every step is retried, so a Zoom or Drive hiccup delays a recording but never loses it.
 */

export interface ZoomRecordingFile {
  id: string;
  fileType: string;
  recordingType: string;
  size: number;
  downloadUrl: string;
}

/** Retry waits (minutes) after each failed attempt; after the last one the job is marked FAILED for staff. */
const RETRY_WAIT_MINUTES = [5, 15, 30, 60, 180];
export const MAX_ATTEMPTS = RETRY_WAIT_MINUTES.length + 1;
const LOCK_MINUTES = 12;

// Preferred picture first: the view that shows the teacher's shared screen/board best.
const VIDEO_PREFERENCE = ["shared_screen_with_speaker_view", "shared_screen_with_gallery_view", "shared_screen", "active_speaker", "speaker_view", "gallery_view"];
const MAX_INT = 2_147_483_647;

/** Pieces of the system the processing step talks to — replaceable so it can be tested without Zoom or Drive. */
export interface RecordingDeps {
  openDownload: (url: string, token: string | null) => Promise<Response>;
  uploadStream: (input: { filename: string; mimeType: string; size: number; stream: ReadableStream<Uint8Array> }) => Promise<string>;
  getDriveFileSize: (fileId: string) => Promise<number | null>;
  deleteDriveFile: (fileId: string) => Promise<void>;
  deleteFromZoom: (meetingUuid: string) => Promise<void>;
}

function defaultDeps(): RecordingDeps {
  const drive = new GoogleDriveStorageProvider();
  return {
    openDownload: openZoomRecordingDownload,
    uploadStream: (input) => drive.uploadStream(input),
    getDriveFileSize: async (fileId) => (await drive.getFileInfo(fileId))?.size ?? null,
    deleteDriveFile: (fileId) => drive.delete(fileId),
    deleteFromZoom: deleteZoomMeetingRecordings,
  };
}

/* -------------------------------------------------------------------------- */
/* Receiving the "recording is ready" notice                                  */
/* -------------------------------------------------------------------------- */

interface RawRecordingFile {
  id?: unknown;
  file_type?: unknown;
  recording_type?: unknown;
  file_size?: unknown;
  download_url?: unknown;
  status?: unknown;
}

/** Reads Zoom's `recording.completed` body and queues the copy. Safe to call twice for the same meeting. */
export async function enqueueRecordingCompleted(body: { download_token?: unknown; payload?: { object?: Record<string, unknown> } }): Promise<{ jobId: string | null }> {
  const object = body.payload?.object;
  const uuid = typeof object?.uuid === "string" ? object.uuid : null;
  const meetingId = object?.id != null ? String(object.id) : null;
  if (!uuid || !meetingId) return { jobId: null };

  const existing = await db.zoomRecordingJob.findUnique({ where: { meetingUuid: uuid }, select: { id: true } });
  if (existing) return { jobId: existing.id };

  const rawFiles = Array.isArray(object?.recording_files) ? (object.recording_files as RawRecordingFile[]) : [];
  const files: ZoomRecordingFile[] = [];
  for (const f of rawFiles) {
    if (typeof f.download_url !== "string" || !isZoomDownloadUrl(f.download_url)) continue;
    if (f.status != null && f.status !== "completed") continue;
    files.push({
      id: String(f.id ?? ""),
      fileType: String(f.file_type ?? "").toUpperCase(),
      recordingType: String(f.recording_type ?? ""),
      size: Number(f.file_size) || 0,
      downloadUrl: f.download_url,
    });
  }

  const liveClass = await db.liveClass.findUnique({ where: { zoomMeetingId: meetingId }, select: { id: true } });
  const token = typeof body.download_token === "string" && body.download_token ? body.download_token : null;

  try {
    const job = await db.zoomRecordingJob.create({
      data: {
        meetingUuid: uuid,
        zoomMeetingId: meetingId,
        liveClassId: liveClass?.id ?? null,
        // A recording that isn't one of this app's classes is left alone — never copied, never deleted.
        status: liveClass ? "PENDING" : "SKIPPED",
        lastError: liveClass ? null : "This recording doesn't belong to a class scheduled in the app, so it was left in Zoom.",
        files: files as unknown as Prisma.InputJsonValue,
        downloadTokenEnc: token ? encryptSecret(token) : null,
      },
    });
    return { jobId: liveClass ? job.id : null };
  } catch {
    // Zoom delivered the same notice twice at once; the other request already queued it.
    const again = await db.zoomRecordingJob.findUnique({ where: { meetingUuid: uuid }, select: { id: true } });
    return { jobId: again?.id ?? null };
  }
}

/** `meeting.ended`: closes the class once its scheduled time is essentially over (a teacher who ends early and restarts keeps it open). */
export async function handleMeetingEnded(zoomMeetingId: string, now = new Date()) {
  const liveClass = await db.liveClass.findUnique({ where: { zoomMeetingId }, select: { id: true, status: true, scheduledDate: true, endTime: true } });
  if (!liveClass || liveClass.status === "COMPLETED" || liveClass.status === "CANCELLED") return;
  const endsAt = combineDateAndTime(liveClass.scheduledDate, liveClass.endTime).getTime();
  if (now.getTime() >= endsAt - 15 * 60_000) await db.liveClass.update({ where: { id: liveClass.id }, data: { status: "COMPLETED" } });
}

/* -------------------------------------------------------------------------- */
/* Copying                                                                    */
/* -------------------------------------------------------------------------- */

function pickRecordingFile(files: ZoomRecordingFile[]): ZoomRecordingFile | null {
  const videos = files.filter((f) => f.fileType === "MP4");
  if (videos.length > 0) {
    const rank = (f: ZoomRecordingFile) => {
      const i = VIDEO_PREFERENCE.indexOf(f.recordingType);
      return i === -1 ? VIDEO_PREFERENCE.length : i;
    };
    return [...videos].sort((a, b) => rank(a) - rank(b) || b.size - a.size)[0];
  }
  // A class with no picture at all (rare) still keeps its sound.
  return files.find((f) => f.fileType === "M4A") ?? null;
}

function safeFilename(name: string) {
  return name.replace(/[^\p{L}\p{N} ._()-]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "Class recording";
}

/** Takes the job for this run, or returns null if another run has it / it isn't due. */
async function claim(jobId: string, now: Date): Promise<ZoomRecordingJob | null> {
  const claimed = await db.zoomRecordingJob.updateMany({
    where: {
      id: jobId,
      nextAttemptAt: { lte: now },
      OR: [{ status: "PENDING" }, { status: "COPYING", lockedUntil: { lt: now } }],
    },
    data: { status: "COPYING", lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000), attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return null;
  return db.zoomRecordingJob.findUnique({ where: { id: jobId } });
}

async function fail(job: ZoomRecordingJob, err: unknown, now: Date) {
  const message = (err instanceof Error ? err.message : "Unknown error").slice(0, 500);
  const finished = job.attempts >= MAX_ATTEMPTS;
  const wait = RETRY_WAIT_MINUTES[Math.min(job.attempts - 1, RETRY_WAIT_MINUTES.length - 1)];
  await db.zoomRecordingJob.update({
    where: { id: job.id },
    data: {
      status: finished ? "FAILED" : "PENDING",
      lastError: message,
      lockedUntil: null,
      nextAttemptAt: new Date(now.getTime() + wait * 60_000),
    },
  });
  console.error(`Zoom recording ${job.meetingUuid} failed (attempt ${job.attempts}/${MAX_ATTEMPTS})`, err);
}

/**
 * Does one pass over one job. Returns what happened so callers and tests can see it. Never throws:
 * a failure is stored on the job and retried later.
 */
export async function processRecordingJob(jobId: string, deps: RecordingDeps = defaultDeps(), now = new Date()): Promise<"done" | "skipped" | "retry" | "failed" | "busy"> {
  const job = await claim(jobId, now);
  if (!job) return "busy";

  try {
    const liveClass = job.liveClassId
      ? await db.liveClass.findUnique({ where: { id: job.liveClassId }, select: { id: true, title: true, subjectId: true, batchId: true, chapter: true, scheduledDate: true } })
      : null;
    if (!liveClass) {
      await db.zoomRecordingJob.update({ where: { id: job.id }, data: { status: "SKIPPED", lockedUntil: null, lastError: "The class this recording belongs to no longer exists." } });
      return "skipped";
    }

    let recordingId = job.classRecordingId;

    // The copy may already be saved from an earlier pass whose only unfinished step was the Zoom clean-up.
    if (!recordingId) {
      const files = (Array.isArray(job.files) ? job.files : []) as unknown as ZoomRecordingFile[];
      const file = pickRecordingFile(files);
      if (!file) {
        await db.zoomRecordingJob.update({ where: { id: job.id }, data: { status: "SKIPPED", lockedUntil: null, lastError: "Zoom didn't list a video file for this class." } });
        return "skipped";
      }

      const token = job.downloadTokenEnc ? decryptSecret(job.downloadTokenEnc) : null;
      const download = await deps.openDownload(file.downloadUrl, token);
      const headerLength = Number(download.headers.get("content-length"));
      const size = file.size > 0 ? file.size : headerLength;
      if (!(size > 0)) throw new Error("Zoom didn't say how big the recording is.");
      if (headerLength > 0 && file.size > 0 && headerLength !== file.size) throw new Error(`Zoom sent ${headerLength} bytes but announced ${file.size}.`);

      const isAudio = file.fileType === "M4A";
      const mimeType = isAudio ? "audio/mp4" : "video/mp4";
      const dateLabel = liveClass.scheduledDate.toISOString().slice(0, 10);
      const existingCount = await db.classRecording.count({ where: { liveClassId: liveClass.id } });
      const title = existingCount > 0 ? `${liveClass.title} (part ${existingCount + 1})` : liveClass.title;

      const driveFileId = await deps.uploadStream({ filename: `${safeFilename(title)} - ${dateLabel}.${isAudio ? "m4a" : "mp4"}`, mimeType, size, stream: download.body! });

      // Check the copy before anything is deleted from Zoom.
      const stored = await deps.getDriveFileSize(driveFileId);
      if (stored !== size) {
        await deps.deleteDriveFile(driveFileId).catch(() => {});
        throw new Error(`The copy in Drive is ${stored ?? "missing"} bytes but the recording is ${size}. It was discarded and will be retried.`);
      }

      const recording = await db.classRecording.create({
        data: {
          title,
          liveClassId: liveClass.id,
          subjectId: liveClass.subjectId,
          batchId: liveClass.batchId,
          chapter: liveClass.chapter ?? undefined,
          recordingDate: liveClass.scheduledDate,
          driveFileId,
          mimeType,
          sizeBytes: size <= MAX_INT ? size : null,
        },
      });
      recordingId = recording.id;
      await db.zoomRecordingJob.update({ where: { id: job.id }, data: { classRecordingId: recording.id } });
    }

    // Only now is the recording removed from Zoom, which frees the 10 GB of storage that plan has.
    await deps.deleteFromZoom(job.meetingUuid);
    await db.zoomRecordingJob.update({ where: { id: job.id }, data: { status: "DONE", lockedUntil: null, lastError: null, completedAt: new Date(), downloadTokenEnc: null } });
    return "done";
  } catch (err) {
    await fail(job, err, now);
    return job.attempts >= MAX_ATTEMPTS ? "failed" : "retry";
  }
}

/** Runs every job that is due. Used by the scheduled retry job. */
export async function runDueRecordingJobs(limit = 2, now = new Date()) {
  const due = await db.zoomRecordingJob.findMany({
    where: { nextAttemptAt: { lte: now }, OR: [{ status: "PENDING" }, { status: "COPYING", lockedUntil: { lt: now } }] },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
    select: { id: true },
  });
  let done = 0;
  for (const j of due) {
    if ((await processRecordingJob(j.id, undefined, now)) === "done") done += 1;
  }
  return { processed: done, due: due.length };
}

/** Staff button on the health page: puts a failed or skipped recording back in the queue. */
export async function retryRecordingJob(jobId: string) {
  const res = await db.zoomRecordingJob.updateMany({
    where: { id: jobId, status: { in: ["FAILED", "SKIPPED"] }, liveClassId: { not: null } },
    data: { status: "PENDING", attempts: 0, nextAttemptAt: new Date(), lockedUntil: null, lastError: null },
  });
  return res.count > 0;
}

export function listRecordingJobs(limit = 15) {
  return db.zoomRecordingJob.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { liveClass: { select: { title: true, batch: { select: { name: true } } } } },
  });
}
