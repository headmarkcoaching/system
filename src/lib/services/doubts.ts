import "server-only";
import { db } from "@/lib/db";
import type { DoubtStatus } from "@prisma/client";

/** An open doubt untouched for this long is flagged as overdue to the teacher and admin. */
export const DOUBT_OVERDUE_HOURS = 24;

const listInclude = {
  student: { select: { id: true, fullName: true, userId: true } },
  subject: { select: { id: true, name: true } },
  batch: { select: { id: true, name: true } },
} as const;

/** Subjects a student can ask about, each paired with the batch that teaches it. A subject that
 * appears in two of the student's batches is listed once, under the first. */
export async function listAskableSubjects(studentId: string) {
  const memberships = await db.batchStudent.findMany({
    where: { studentId },
    include: { batch: { include: { subjects: { include: { subject: true } } } } },
    orderBy: { joinedAt: "asc" },
  });
  const seen = new Map<string, { subjectId: string; subjectName: string; batchId: string; batchName: string }>();
  for (const m of memberships) {
    for (const bs of m.batch.subjects) {
      if (!seen.has(bs.subjectId)) {
        seen.set(bs.subjectId, { subjectId: bs.subjectId, subjectName: bs.subject.name, batchId: m.batchId, batchName: m.batch.name });
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}

/** Teachers assigned to this batch for this subject. A teacher assigned to a batch with no
 * subject set covers every subject of that batch. */
export function listTeachersForBatchSubject(batchId: string, subjectId: string) {
  return db.batchTeacher.findMany({
    where: { batchId, OR: [{ subjectId }, { subjectId: null }] },
    include: { teacher: { select: { id: true, userId: true, fullName: true } } },
  });
}

export async function teacherCanAnswer(teacherId: string, batchId: string, subjectId: string) {
  const row = await db.batchTeacher.findFirst({ where: { teacherId, batchId, OR: [{ subjectId }, { subjectId: null }] }, select: { id: true } });
  return !!row;
}

export interface CreateDoubtInput {
  studentId: string;
  batchId: string;
  subjectId: string;
  chapter?: string;
  title: string;
  body: string;
  attachmentFileId?: string;
}

export function createDoubt(input: CreateDoubtInput) {
  return db.doubt.create({ data: input });
}

export function listDoubtsForStudent(studentId: string) {
  return db.doubt.findMany({ where: { studentId }, include: listInclude, orderBy: { lastActivityAt: "desc" } });
}

/** The doubts a teacher is expected to answer: every doubt in a batch and subject they teach. */
export async function listDoubtsForTeacher(teacherId: string, status?: DoubtStatus) {
  const assignments = await db.batchTeacher.findMany({ where: { teacherId }, select: { batchId: true, subjectId: true } });
  if (assignments.length === 0) return [];
  return db.doubt.findMany({
    where: {
      ...(status ? { status } : {}),
      OR: assignments.map((a) => ({ batchId: a.batchId, ...(a.subjectId ? { subjectId: a.subjectId } : {}) })),
    },
    include: listInclude,
    orderBy: { lastActivityAt: "desc" },
  });
}

export function listAllDoubts(status?: DoubtStatus) {
  return db.doubt.findMany({ where: status ? { status } : {}, include: listInclude, orderBy: { lastActivityAt: "desc" }, take: 300 });
}

export function getDoubt(id: string) {
  return db.doubt.findUnique({
    where: { id },
    include: {
      ...listInclude,
      attachmentFile: { select: { id: true, filename: true, mimeType: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, roleKey: true } }, attachmentFile: { select: { id: true, filename: true, mimeType: true } } },
      },
    },
  });
}

export function addReply(input: { doubtId: string; authorId: string; body: string; attachmentFileId?: string }) {
  return db.doubtReply.create({ data: input });
}

export function updateDoubt(id: string, data: { status?: DoubtStatus; firstResponseAt?: Date; resolvedAt?: Date | null; lastActivityAt?: Date }) {
  return db.doubt.update({ where: { id }, data });
}

export function isOverdue(doubt: { status: DoubtStatus; lastActivityAt: Date }, now = new Date()) {
  return doubt.status === "OPEN" && now.getTime() - doubt.lastActivityAt.getTime() > DOUBT_OVERDUE_HOURS * 3_600_000;
}

/** Hours elapsed since a doubt last needed an answer, for the "waiting" label. */
export function hoursWaiting(lastActivityAt: Date, now = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - lastActivityAt.getTime()) / 3_600_000));
}

/** Admin summary: how many are open or overdue now, and the typical first-response time over the
 * last 30 days (median, so one very late reply does not distort it). */
export async function getDoubtStats() {
  const since = new Date(Date.now() - 30 * 24 * 3_600_000);
  const [open, openRows, answered] = await Promise.all([
    db.doubt.count({ where: { status: "OPEN" } }),
    db.doubt.findMany({ where: { status: "OPEN" }, select: { status: true, lastActivityAt: true } }),
    db.doubt.findMany({ where: { createdAt: { gte: since }, firstResponseAt: { not: null } }, select: { createdAt: true, firstResponseAt: true } }),
  ]);
  const overdue = openRows.filter((d) => isOverdue(d)).length;
  const hours = answered
    .map((d) => ((d.firstResponseAt as Date).getTime() - d.createdAt.getTime()) / 3_600_000)
    .sort((a, b) => a - b);
  const medianHours = hours.length ? hours[Math.floor(hours.length / 2)] : null;
  return { open, overdue, answeredLast30Days: answered.length, medianFirstResponseHours: medianHours };
}
