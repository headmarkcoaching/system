"use server";

import { requireRoleSession } from "@/lib/session";
import * as studentService from "@/lib/services/students";
import * as batchService from "@/lib/services/batches";
import * as classAccessService from "@/lib/services/class-access";

// The only way a student is given a live class's meeting link. The server checks that they are in the
// batch, the class is live and their fees are in good standing, then returns the link; it is never
// placed in a page, so an unpaid student (or anyone reading the page source) cannot find it there.
export async function getLiveClassJoinLinkAction(liveClassId: string): Promise<{ url?: string; error?: string }> {
  const session = await requireRoleSession(["STUDENT"]);
  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) return { error: "Student profile not found." };
  const result = await classAccessService.getLiveClassJoinLink(student.id, liveClassId);
  return result.url ? { url: result.url } : { error: result.error };
}

// Called every ~30s by JoinLiveClassButton while its tab stays open on a LIVE class.
// Deliberately no revalidatePath — this is a background signal, not a user-visible change,
// and the student's own page has nothing that needs to re-render from it.
export async function pingLiveClassPresenceAction(liveClassId: string) {
  const session = await requireRoleSession(["STUDENT"]);
  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) throw new Error("Student profile not found.");
  await batchService.pingLiveClassPresence(student.id, liveClassId);
}
