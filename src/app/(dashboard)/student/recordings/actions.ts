"use server";

import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import * as studentService from "@/lib/services/students";
import * as contentProgressService from "@/lib/services/content-progress";
import * as recordingAccessService from "@/lib/services/recording-access";

async function resolveOwnStudentId() {
  const session = await requireRoleSession(["STUDENT"]);
  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) throw new Error("Student profile not found.");
  return student.id;
}

// Deliberately no revalidatePath here — this fires every few seconds while a video plays
// (throttled client-side), and the client already updates its own progress-bar state from
// the returned record, so a full server-data refresh on every tick would be wasted work (and
// could visibly disturb the playing <video> element on remount).
export async function recordVideoProgressAction(recordingId: string, positionSeconds: number, durationSeconds: number) {
  const studentId = await resolveOwnStudentId();
  return contentProgressService.recordVideoProgress(studentId, recordingId, positionSeconds, durationSeconds);
}

export async function markRecordingCompleteAction(recordingId: string) {
  const studentId = await resolveOwnStudentId();
  await contentProgressService.markContentComplete(studentId, "RECORDING", recordingId);
  revalidatePath("/student/recordings");
}

// Returns the new expiry so the client can update its own countdown immediately — no
// revalidatePath needed, RecordingItem already manages this state itself.
export async function requestRecordingAccessAction(recordingId: string) {
  const studentId = await resolveOwnStudentId();
  const access = await recordingAccessService.requestRecordingAccess(studentId, recordingId);
  return { expiresAt: access.expiresAt };
}
