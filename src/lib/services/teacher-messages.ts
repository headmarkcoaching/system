import "server-only";
import { db } from "@/lib/db";

export type ThreadSide = "family" | "teacher";

/** Teachers a student can write to: everyone assigned to one of the student's batches, with the
 * subjects each teaches there. A teacher with no subject set on the assignment covers the batch. */
export async function listTeachersForStudent(studentId: string) {
  const memberships = await db.batchStudent.findMany({ where: { studentId }, select: { batchId: true } });
  const batchIds = memberships.map((m) => m.batchId);
  if (batchIds.length === 0) return [];
  const rows = await db.batchTeacher.findMany({
    where: { batchId: { in: batchIds } },
    include: { teacher: { select: { id: true, fullName: true } }, subject: { select: { name: true } } },
  });
  const byTeacher = new Map<string, { teacherId: string; name: string; subjects: Set<string> }>();
  for (const r of rows) {
    const entry = byTeacher.get(r.teacherId) ?? { teacherId: r.teacherId, name: r.teacher.fullName, subjects: new Set<string>() };
    if (r.subject) entry.subjects.add(r.subject.name);
    byTeacher.set(r.teacherId, entry);
  }
  return Array.from(byTeacher.values())
    .map((t) => ({ teacherId: t.teacherId, name: t.name, subjects: Array.from(t.subjects).sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function teacherTeachesStudent(teacherId: string, studentId: string) {
  const memberships = await db.batchStudent.findMany({ where: { studentId }, select: { batchId: true } });
  if (memberships.length === 0) return false;
  const row = await db.batchTeacher.findFirst({ where: { teacherId, batchId: { in: memberships.map((m) => m.batchId) } }, select: { id: true } });
  return !!row;
}

export function createThread(input: { teacherId: string; studentId: string; startedById: string; subject: string; body: string; attachmentFileId?: string }) {
  const now = new Date();
  return db.teacherThread.create({
    data: {
      teacherId: input.teacherId,
      studentId: input.studentId,
      startedById: input.startedById,
      subject: input.subject,
      lastMessageAt: now,
      lastAuthorId: input.startedById,
      familyReadAt: now,
      messages: { create: { authorId: input.startedById, body: input.body, attachmentFileId: input.attachmentFileId } },
    },
  });
}

/** Adds a message and marks the thread read for the sender's own side. */
export async function addMessage(input: { threadId: string; authorId: string; side: ThreadSide; body: string; attachmentFileId?: string }) {
  const now = new Date();
  const [message] = await db.$transaction([
    db.teacherMessage.create({ data: { threadId: input.threadId, authorId: input.authorId, body: input.body, attachmentFileId: input.attachmentFileId } }),
    db.teacherThread.update({
      where: { id: input.threadId },
      data: { lastMessageAt: now, lastAuthorId: input.authorId, ...(input.side === "family" ? { familyReadAt: now } : { teacherReadAt: now }) },
    }),
  ]);
  return message;
}

const threadListInclude = {
  teacher: { select: { id: true, fullName: true } },
  student: { select: { id: true, fullName: true } },
  startedBy: { select: { id: true, name: true } },
} as const;

export function listThreadsForStarter(userId: string) {
  return db.teacherThread.findMany({ where: { startedById: userId }, include: threadListInclude, orderBy: { lastMessageAt: "desc" } });
}

export function listThreadsForTeacher(teacherId: string) {
  return db.teacherThread.findMany({ where: { teacherId }, include: threadListInclude, orderBy: { lastMessageAt: "desc" } });
}

export function listAllThreads() {
  return db.teacherThread.findMany({ include: threadListInclude, orderBy: { lastMessageAt: "desc" }, take: 300 });
}

export function getThread(id: string) {
  return db.teacherThread.findUnique({
    where: { id },
    include: {
      ...threadListInclude,
      teacher: { select: { id: true, userId: true, fullName: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } }, attachmentFile: { select: { id: true, filename: true, mimeType: true } } },
      },
    },
  });
}

export function markRead(threadId: string, side: ThreadSide) {
  return db.teacherThread.update({ where: { id: threadId }, data: side === "family" ? { familyReadAt: new Date() } : { teacherReadAt: new Date() } });
}

/** A thread is unread for a side when the last message is newer than that side's read marker and
 * was written by someone else. */
export function isUnread(thread: { lastMessageAt: Date; lastAuthorId: string | null; familyReadAt: Date | null; teacherReadAt: Date | null }, side: ThreadSide, myUserId: string) {
  if (thread.lastAuthorId === myUserId) return false;
  const readAt = side === "family" ? thread.familyReadAt : thread.teacherReadAt;
  return !readAt || thread.lastMessageAt > readAt;
}
