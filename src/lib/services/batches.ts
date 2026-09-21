import "server-only";
import { db } from "@/lib/db";
import type { BatchStatus, DayOfWeek, MeetingProvider, LiveClassStatus } from "@prisma/client";
import { checkConsecutiveAbsences } from "@/lib/automation/attendance";
import { onAttendanceMarked, onHomeworkSubmitted, onHomeworkReviewed, checkAndAwardStudyStreak } from "@/lib/services/gamification";
import { combineDateAndTime } from "@/lib/utils";

// How much activeSeconds one accepted heartbeat adds — must match the client's ping interval
// (see JoinLiveClassButton) since a ping is trusted at face value, not measured server-side.
const PRESENCE_HEARTBEAT_SECONDS = 30;
// Forgiving window around the scheduled start/end so a slightly early join or a ping that
// lands just after the class officially ends isn't rejected outright.
const PRESENCE_GRACE_MINUTES = 5;

const PAGE_SIZE = 15;

export async function listBatches({ page = 1, q, status }: { page?: number; q?: string; status?: string }) {
  const where = {
    ...(status ? { status: status as BatchStatus } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    db.batch.findMany({
      where,
      include: {
        academicLevel: true,
        _count: { select: { students: true } },
        teachers: { include: { teacher: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.batch.count({ where }),
  ]);

  return { items, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export function listBatchesForTeacher(teacherId: string) {
  return db.batch.findMany({
    where: { teachers: { some: { teacherId } } },
    include: { academicLevel: true, _count: { select: { students: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Every batch, unpaginated — for staff-facing card grids (e.g. Knowledge Base) where showing
 * all of them at once is the point, unlike the paginated admin Batches table. */
export function listAllBatchesBasic() {
  return db.batch.findMany({
    include: { academicLevel: true, _count: { select: { students: true } } },
    orderBy: { name: "asc" },
  });
}

export function listBatchesForPicker() {
  return db.batch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export interface CreateBatchInput {
  name: string;
  academicLevelId: string;
  boardId?: string;
  groupId?: string;
  programId?: string;
  maxStudents: number;
  startDate: string;
  endDate?: string;
  status: BatchStatus;
  createdById: string;
}

export function createBatch(input: CreateBatchInput) {
  return db.batch.create({
    data: {
      name: input.name,
      academicLevelId: input.academicLevelId,
      boardId: input.boardId || undefined,
      groupId: input.groupId || undefined,
      programId: input.programId || undefined,
      maxStudents: input.maxStudents,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      status: input.status,
      createdById: input.createdById,
    },
  });
}

export function updateBatch(id: string, data: Partial<Omit<CreateBatchInput, "createdById">>) {
  return db.batch.update({
    where: { id },
    data: {
      ...data,
      boardId: data.boardId || undefined,
      groupId: data.groupId || undefined,
      programId: data.programId || undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
}

export function setLeaderboardEnabled(id: string, enabled: boolean) {
  return db.batch.update({ where: { id }, data: { leaderboardEnabled: enabled } });
}

export function getBatchById(id: string) {
  return db.batch.findUnique({
    where: { id },
    include: {
      academicLevel: true,
      board: true,
      group: true,
      program: true,
      students: { include: { student: true }, orderBy: { joinedAt: "asc" } },
      teachers: { include: { teacher: true, subject: true } },
      subjects: { include: { subject: true } },
    },
  });
}

export async function batchDashboardStats(batchId: string) {
  const [studentCount, attendanceAgg, upcomingClass] = await Promise.all([
    db.batchStudent.count({ where: { batchId } }),
    db.attendance.groupBy({ by: ["status"], where: { batchId }, _count: true }),
    db.liveClass.findFirst({
      where: { batchId, status: { in: ["UPCOMING", "LIVE"] } },
      orderBy: { scheduledDate: "asc" },
      include: { subject: true, teacher: true },
    }),
  ]);

  const totalMarks = attendanceAgg.reduce((sum, g) => sum + g._count, 0);
  const presentMarks = attendanceAgg.filter((g) => g.status === "PRESENT" || g.status === "LATE").reduce((sum, g) => sum + g._count, 0);
  const attendanceRate = totalMarks === 0 ? 0 : Math.round((presentMarks / totalMarks) * 100);

  return { studentCount, attendanceRate, upcomingClass };
}

// ---- Roster ----

export function addStudentToBatch(batchId: string, studentId: string) {
  return db.$transaction([
    db.batchStudent.create({ data: { batchId, studentId } }),
    db.enrollment.upsert({
      where: { studentId_batchId: { studentId, batchId } },
      update: {},
      create: { studentId, batchId },
    }),
  ]);
}

export function removeStudentFromBatch(batchId: string, studentId: string) {
  return db.batchStudent.deleteMany({ where: { batchId, studentId } });
}

// ---- Teacher / subject assignment ----

export function assignTeacherToBatch(batchId: string, teacherId: string, subjectId?: string) {
  return db.batchTeacher.create({ data: { batchId, teacherId, subjectId: subjectId || undefined } });
}

export function removeTeacherFromBatch(batchTeacherId: string) {
  return db.batchTeacher.delete({ where: { id: batchTeacherId } });
}

export function addSubjectToBatch(batchId: string, subjectId: string) {
  return db.batchSubject.create({ data: { batchId, subjectId } });
}

export function removeSubjectFromBatch(batchSubjectId: string) {
  return db.batchSubject.delete({ where: { id: batchSubjectId } });
}

// ---- Timetable ----

export function listTimetable({ batchId }: { batchId?: string }) {
  return db.timetable.findMany({
    where: batchId ? { batchId } : undefined,
    include: { batch: true, subject: true, teacher: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export function listTimetableForTeacher(teacherId: string) {
  return db.timetable.findMany({
    where: { teacherId },
    include: { batch: true, subject: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export async function listTimetableForStudent(studentId: string) {
  const batchIds = (await db.batchStudent.findMany({ where: { studentId }, select: { batchId: true } })).map((b) => b.batchId);
  return db.timetable.findMany({
    where: { batchId: { in: batchIds } },
    include: { batch: true, subject: true, teacher: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export interface CreateTimetableInput {
  batchId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export function createTimetableEntry(input: CreateTimetableInput) {
  return db.timetable.create({ data: input });
}

export function deleteTimetableEntry(id: string) {
  return db.timetable.delete({ where: { id } });
}

// ---- Live classes ----

export function listLiveClassesForBatch(batchId: string) {
  return db.liveClass.findMany({ where: { batchId }, include: { subject: true, teacher: true }, orderBy: { scheduledDate: "desc" } });
}

export async function listTodaysClassesForTeacher(teacherId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return db.liveClass.findMany({
    where: { teacherId, scheduledDate: { gte: start, lte: end } },
    include: { subject: true, batch: true },
    orderBy: { startTime: "asc" },
  });
}

export async function listTodaysClassesForStudent(studentId: string) {
  const batchIds = (await db.batchStudent.findMany({ where: { studentId }, select: { batchId: true } })).map((b) => b.batchId);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return db.liveClass.findMany({
    where: { batchId: { in: batchIds }, scheduledDate: { gte: start, lte: end } },
    include: { subject: true, teacher: true, batch: true },
    orderBy: { startTime: "asc" },
  });
}

export interface CreateLiveClassInput {
  title: string;
  subjectId: string;
  chapter?: string;
  batchId: string;
  teacherId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  meetingProvider: MeetingProvider;
  meetingLink: string;
  googleEventId?: string;
  createdById: string;
}

export function createLiveClass(input: CreateLiveClassInput) {
  return db.liveClass.create({
    data: { ...input, scheduledDate: new Date(input.scheduledDate) },
  });
}

export function updateLiveClassStatus(id: string, status: LiveClassStatus) {
  return db.liveClass.update({ where: { id }, data: { status } });
}

// ---- Attendance ----

export async function getRosterForLiveClass(liveClassId: string) {
  const liveClass = await db.liveClass.findUniqueOrThrow({ where: { id: liveClassId }, include: { batch: true } });
  const roster = await db.batchStudent.findMany({ where: { batchId: liveClass.batchId }, include: { student: true }, orderBy: { student: { fullName: "asc" } } });
  const existing = await db.attendance.findMany({ where: { liveClassId } });
  const existingByStudent = new Map(existing.map((a) => [a.studentId, a]));
  return { liveClass, roster, existingByStudent };
}

/**
 * Free, estimate-only attendance signal: accepts one heartbeat from a student's own
 * dashboard while a live class is on, and accumulates active seconds against it. Rejects a
 * ping if the student isn't enrolled in the class's batch, or if the current time falls
 * outside the class's scheduled window (with a small grace period). The accumulated total
 * is later turned into a real, clearly-flagged Attendance row by the attendance-auto-detect
 * job — never here, since a single ping says nothing about the full session.
 */
export async function pingLiveClassPresence(studentId: string, liveClassId: string) {
  const liveClass = await db.liveClass.findUnique({ where: { id: liveClassId } });
  if (!liveClass) throw new Error("Class not found.");

  const enrolled = await db.batchStudent.findFirst({ where: { batchId: liveClass.batchId, studentId } });
  if (!enrolled) throw new Error("Not enrolled in this class's batch.");

  const now = new Date();
  const graceMs = PRESENCE_GRACE_MINUTES * 60_000;
  const startAt = combineDateAndTime(liveClass.scheduledDate, liveClass.startTime);
  const endAt = combineDateAndTime(liveClass.scheduledDate, liveClass.endTime);
  if (now.getTime() < startAt.getTime() - graceMs || now.getTime() > endAt.getTime() + graceMs) {
    throw new Error("Outside the class's scheduled window.");
  }

  return db.liveClassPresence.upsert({
    where: { liveClassId_studentId: { liveClassId, studentId } },
    update: { activeSeconds: { increment: PRESENCE_HEARTBEAT_SECONDS }, lastPingAt: now },
    create: { liveClassId, studentId, activeSeconds: PRESENCE_HEARTBEAT_SECONDS, lastPingAt: now },
  });
}

export async function markAttendance(
  liveClassId: string,
  batchId: string,
  subjectId: string,
  date: Date,
  markedById: string,
  entries: { studentId: string; status: string }[]
) {
  const results = await db.$transaction(
    entries.map((entry) =>
      db.attendance.upsert({
        where: { studentId_liveClassId: { studentId: entry.studentId, liveClassId } },
        update: { status: entry.status as never, markedById, isAutoDetected: false },
        create: {
          studentId: entry.studentId,
          liveClassId,
          batchId,
          subjectId,
          date,
          status: entry.status as never,
          markedById,
          isAutoDetected: false,
        },
      })
    )
  );

  // Automation must never block the attendance save itself — same non-fatal pattern as logAudit.
  for (const entry of entries) {
    if (entry.status === "ABSENT") {
      try {
        await checkConsecutiveAbsences(entry.studentId, batchId);
      } catch (err) {
        console.error("checkConsecutiveAbsences failed", err);
      }
    }
    if (entry.status === "PRESENT") {
      try {
        await onAttendanceMarked(entry.studentId, liveClassId, entry.status);
        await checkAndAwardStudyStreak(entry.studentId);
      } catch (err) {
        console.error("gamification attendance hook failed", err);
      }
    }
  }

  return results;
}

export function batchAttendanceHistory(batchId: string) {
  return db.attendance.findMany({
    where: { batchId },
    include: { student: true, liveClass: true },
    orderBy: { date: "desc" },
    take: 100,
  });
}

// ---- Homework ----

export function listHomeworkForBatch(batchId: string) {
  return db.homework.findMany({
    where: { batchId },
    include: { subject: true, submissions: { include: { student: true }, orderBy: { student: { fullName: "asc" } } } },
    orderBy: { dueDate: "desc" },
  });
}

export async function listHomeworkForTeacher(teacherId: string) {
  const batchIds = (await db.batchTeacher.findMany({ where: { teacherId }, select: { batchId: true }, distinct: ["batchId"] })).map((b) => b.batchId);
  return db.homework.findMany({
    where: { batchId: { in: batchIds } },
    include: { subject: true, batch: true, submissions: { include: { student: true }, orderBy: { student: { fullName: "asc" } } } },
    orderBy: { dueDate: "desc" },
  });
}

export interface CreateHomeworkInput {
  title: string;
  description: string;
  subjectId: string;
  chapter?: string;
  batchId: string;
  dueDate: string;
  maxMarks?: number;
  attachmentUrl?: string;
  createdById: string;
}

export async function createHomework(input: CreateHomeworkInput) {
  const homework = await db.homework.create({
    data: { ...input, dueDate: new Date(input.dueDate) },
  });

  const roster = await db.batchStudent.findMany({ where: { batchId: input.batchId } });
  if (roster.length > 0) {
    await db.homeworkSubmission.createMany({
      data: roster.map((r) => ({ homeworkId: homework.id, studentId: r.studentId })),
      skipDuplicates: true,
    });
  }

  return homework;
}

export function getHomeworkWithSubmissions(homeworkId: string) {
  return db.homework.findUnique({
    where: { id: homeworkId },
    include: { subject: true, batch: true, submissions: { include: { student: true }, orderBy: { student: { fullName: "asc" } } } },
  });
}

/** studentId is required and enforced in the WHERE clause (not just passed through) — found
 * during the Phase 3E security review that the caller previously trusted submissionId alone,
 * which would let any student overwrite another student's homework submission by ID. Prisma
 * throws P2025 ("record not found") if submissionId doesn't belong to studentId, since the
 * compound where then matches zero rows — the caller (Server Action) surfaces that as a
 * generic error rather than silently succeeding on the wrong row. */
export async function studentSubmitHomework(submissionId: string, studentId: string, data: { attachmentUrl?: string; attachmentFileId?: string; studentComments?: string }) {
  const existing = await db.homeworkSubmission.findUnique({ where: { id: submissionId }, select: { studentId: true } });
  if (!existing || existing.studentId !== studentId) {
    throw new Error("Submission not found.");
  }

  const submission = await db.homeworkSubmission.update({
    where: { id: submissionId },
    data: { ...data, status: "SUBMITTED", submittedAt: new Date() },
  });

  try {
    await onHomeworkSubmitted(submission.studentId, submission.id);
  } catch (err) {
    console.error("onHomeworkSubmitted failed", err);
  }

  return submission;
}

export async function gradeHomeworkSubmission(
  submissionId: string,
  reviewedById: string,
  data: { marksObtained?: number; teacherFeedback?: string; status: "REVIEWED" | "RESUBMISSION_REQUESTED" }
) {
  const submission = await db.homeworkSubmission.update({
    where: { id: submissionId },
    data: { ...data, reviewedById, reviewedAt: new Date() },
  });

  try {
    await onHomeworkReviewed(submission.studentId, submission.id, submission.status);
  } catch (err) {
    console.error("onHomeworkReviewed failed", err);
  }

  return submission;
}

// ---- Recordings ----

export function listRecordingsForBatch(batchId: string) {
  return db.classRecording.findMany({ where: { batchId }, include: { subject: true }, orderBy: { recordingDate: "desc" } });
}

export interface CreateRecordingInput {
  title: string;
  subjectId: string;
  batchId: string;
  chapter?: string;
  recordingDate: string;
  recordingUrl: string;
  liveClassId: string;
  createdById: string;
}

export function createRecording(input: CreateRecordingInput) {
  return db.classRecording.create({ data: { ...input, recordingDate: new Date(input.recordingDate) } });
}
