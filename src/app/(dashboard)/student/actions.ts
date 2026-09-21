"use server";

import { requireRoleSession } from "@/lib/session";
import * as studentService from "@/lib/services/students";
import * as batchService from "@/lib/services/batches";

// Called every ~30s by JoinLiveClassButton while its tab stays open on a LIVE class.
// Deliberately no revalidatePath — this is a background signal, not a user-visible change,
// and the student's own page has nothing that needs to re-render from it.
export async function pingLiveClassPresenceAction(liveClassId: string) {
  const session = await requireRoleSession(["STUDENT"]);
  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) throw new Error("Student profile not found.");
  await batchService.pingLiveClassPresence(student.id, liveClassId);
}
