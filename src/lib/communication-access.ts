import "server-only";
import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { ForbiddenError, STAFF_ROLES } from "@/lib/permissions";
import * as doubtService from "@/lib/services/doubts";

export type DoubtViewer = "student" | "teacher" | "admin";
export type ThreadViewer = "family" | "teacher" | "admin";

/** Who may open a doubt: the student who asked, any teacher assigned to that batch and subject,
 * and admins. Everyone else is rejected. */
export async function getDoubtAccess(session: Session, doubtId: string): Promise<{ doubt: NonNullable<Awaited<ReturnType<typeof doubtService.getDoubt>>>; viewer: DoubtViewer }> {
  const doubt = await doubtService.getDoubt(doubtId);
  if (!doubt) throw new ForbiddenError("You do not have access to this doubt.");

  if (STAFF_ROLES.includes(session.user.role)) return { doubt, viewer: "admin" };

  if (session.user.role === "STUDENT") {
    const student = await db.student.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (student?.id === doubt.studentId) return { doubt, viewer: "student" };
  }

  if (session.user.role === "TEACHER") {
    const teacher = await db.teacher.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (teacher && (await doubtService.teacherCanAnswer(teacher.id, doubt.batchId, doubt.subjectId))) return { doubt, viewer: "teacher" };
  }

  throw new ForbiddenError("You do not have access to this doubt.");
}

/** Who may open a teacher thread: the parent or student who started it, the teacher it is
 * addressed to, and admins (read-only, for oversight). */
export async function getThreadAccess(session: Session, threadId: string) {
  const thread = await db.teacherThread.findUnique({ where: { id: threadId }, select: { id: true, teacherId: true, startedById: true } });
  if (!thread) throw new ForbiddenError("You do not have access to this conversation.");

  let viewer: ThreadViewer | null = null;
  if (STAFF_ROLES.includes(session.user.role)) viewer = "admin";
  else if (thread.startedById === session.user.id) viewer = "family";
  else if (session.user.role === "TEACHER") {
    const teacher = await db.teacher.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (teacher?.id === thread.teacherId) viewer = "teacher";
  }

  if (!viewer) throw new ForbiddenError("You do not have access to this conversation.");
  return { thread, viewer };
}
