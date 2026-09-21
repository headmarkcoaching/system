import "server-only";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { Gender, StudentStatus } from "@prisma/client";

const PAGE_SIZE = 15;

export async function generateStudentCode() {
  const count = await db.student.count();
  return `STU-${String(count + 1).padStart(5, "0")}`;
}

export async function listStudents({
  page = 1,
  q,
  status,
  academicLevelId,
}: {
  page?: number;
  q?: string;
  status?: string;
  academicLevelId?: string;
}) {
  const where = {
    ...(status ? { status: status as StudentStatus } : {}),
    ...(academicLevelId ? { academicLevelId } : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" as const } },
            { studentCode: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.student.findMany({
      where,
      include: { academicLevel: true, board: true, group: true, batchMemberships: { include: { batch: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.student.count({ where }),
  ]);

  return { items, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function listStudentsForPicker(q?: string) {
  return db.student.findMany({
    where: q
      ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { studentCode: { contains: q, mode: "insensitive" } }] }
      : undefined,
    take: 20,
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, studentCode: true, academicLevel: { select: { name: true } } },
  });
}

export function getStudentByUserId(userId: string) {
  return db.student.findUnique({ where: { userId }, include: { academicLevel: true } });
}

/** Students in any batch this teacher is assigned to — used to scope teacher-facing pickers
 * (e.g. AI Teacher Assistant's Revision Topics tool) to a teacher's own students. */
export async function listStudentsForTeacher(teacherId: string) {
  const memberships = await db.batchStudent.findMany({
    where: { batch: { teachers: { some: { teacherId } } } },
    include: { student: { select: { id: true, fullName: true, studentCode: true } } },
  });
  const seen = new Set<string>();
  return memberships
    .filter((m) => (seen.has(m.studentId) ? false : (seen.add(m.studentId), true)))
    .map((m) => m.student)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export function getStudentById(id: string) {
  return db.student.findUnique({
    where: { id },
    include: {
      academicLevel: true,
      board: true,
      group: true,
      parents: { include: { parent: true } },
      batchMemberships: { include: { batch: { include: { academicLevel: true } } } },
      user: true,
    },
  });
}

export interface CreateStudentInput {
  fullName: string;
  dateOfBirth?: string;
  gender?: Gender;
  phone?: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  address?: string;
  academicLevelId: string;
  boardId?: string;
  groupId?: string;
  school?: string;
  status: StudentStatus;
  enrollmentDate?: string;
  createLogin?: boolean;
  loginPassword?: string;
  createdById: string;
}

export async function createStudent(input: CreateStudentInput) {
  const studentCode = await generateStudentCode();

  let userId: string | undefined;
  if (input.createLogin && (input.email || input.phone) && input.loginPassword) {
    const role = await db.role.findUniqueOrThrow({ where: { key: "STUDENT" } });
    const passwordHash = await bcrypt.hash(input.loginPassword, 10);
    const user = await db.user.create({
      data: {
        name: input.fullName,
        email: input.email || undefined,
        phone: input.phone || undefined,
        passwordHash,
        roleId: role.id,
        roleKey: "STUDENT",
      },
    });
    userId = user.id;
  }

  return db.student.create({
    data: {
      studentCode,
      userId,
      fullName: input.fullName,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
      gender: input.gender,
      phone: input.phone,
      whatsapp: input.whatsapp,
      email: input.email,
      city: input.city,
      address: input.address,
      academicLevelId: input.academicLevelId,
      boardId: input.boardId || undefined,
      groupId: input.groupId || undefined,
      school: input.school,
      status: input.status,
      statusChangedAt: new Date(),
      enrollmentDate: input.enrollmentDate ? new Date(input.enrollmentDate) : undefined,
      createdById: input.createdById,
    },
  });
}

export function updateStudentPhoto(id: string, photoUrl: string) {
  return db.student.update({ where: { id }, data: { photoUrl } });
}

export async function updateStudent(id: string, data: Partial<Omit<CreateStudentInput, "createdById" | "createLogin" | "loginPassword">>) {
  // statusChangedAt should only move when the status actually changes — the edit form
  // resubmits the whole record (including the unchanged status) on every save, so this
  // can't just stamp "whenever status is present in the payload".
  let statusChangedAt: Date | undefined;
  if (data.status) {
    const current = await db.student.findUnique({ where: { id }, select: { status: true } });
    if (current && current.status !== data.status) statusChangedAt = new Date();
  }

  return db.student.update({
    where: { id },
    data: {
      ...data,
      boardId: data.boardId || undefined,
      groupId: data.groupId || undefined,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      enrollmentDate: data.enrollmentDate ? new Date(data.enrollmentDate) : undefined,
      statusChangedAt,
    },
  });
}

export async function linkParentToStudent(studentId: string, parentId: string, relationship: string, isPrimary: boolean) {
  return db.studentParentRelationship.create({
    data: { studentId, parentId, relationship: relationship as never, isPrimary },
  });
}

export async function unlinkParentFromStudent(studentId: string, parentId: string) {
  return db.studentParentRelationship.deleteMany({ where: { studentId, parentId } });
}

export async function addStudentNote(studentId: string, authorId: string, note: string) {
  return db.studentNote.create({ data: { studentId, authorId, note } });
}

export function listStudentNotes(studentId: string) {
  return db.studentNote.findMany({ where: { studentId }, include: { author: true }, orderBy: { createdAt: "desc" } });
}

// ---- Student 360 tab data ----

export function getStudentAttendance(studentId: string) {
  return db.attendance.findMany({
    where: { studentId },
    include: { liveClass: { include: { subject: true } } },
    orderBy: { date: "desc" },
    take: 60,
  });
}

export function getStudentHomework(studentId: string) {
  return db.homeworkSubmission.findMany({
    where: { studentId },
    include: { homework: { include: { subject: true, batch: true } } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
}

export async function getStudentClasses(studentId: string) {
  const batchIds = (await db.batchStudent.findMany({ where: { studentId }, select: { batchId: true } })).map((b) => b.batchId);
  if (batchIds.length === 0) return [];
  return db.liveClass.findMany({
    where: { batchId: { in: batchIds } },
    include: { subject: true, teacher: true, batch: true },
    orderBy: { scheduledDate: "desc" },
    take: 40,
  });
}

export async function getStudentRecordings(studentId: string) {
  const batchIds = (await db.batchStudent.findMany({ where: { studentId }, select: { batchId: true } })).map((b) => b.batchId);
  if (batchIds.length === 0) return [];
  return db.classRecording.findMany({
    where: { batchId: { in: batchIds } },
    include: { subject: true },
    orderBy: { recordingDate: "desc" },
    take: 40,
  });
}

export async function getStudentStudyMaterial(studentId: string) {
  const student = await db.student.findUnique({ where: { id: studentId }, select: { academicLevelId: true } });
  if (!student) return [];
  return db.studyMaterial.findMany({
    where: { academicLevelId: student.academicLevelId },
    include: { subject: true, file: { select: { mimeType: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Distinct {id, name} subjects across a student's batch memberships — used wherever a subject
 * picker needs to be scoped to what this student is actually enrolled in (Learning Path, Exam
 * Prep, Goals), not the full academy-wide subject list. */
export async function listSubjectsForStudent(studentId: string) {
  const memberships = await db.batchStudent.findMany({
    where: { studentId },
    include: { batch: { include: { subjects: { include: { subject: true } } } } },
  });
  const seen = new Map<string, string>();
  for (const bm of memberships) {
    for (const bs of bm.batch.subjects) {
      seen.set(bs.subject.id, bs.subject.name);
    }
  }
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}

export function computeAttendanceRate(records: { status: string }[]) {
  if (records.length === 0) return 0;
  const points = records.reduce((sum, r) => {
    if (r.status === "PRESENT" || r.status === "LATE") return sum + 1;
    if (r.status === "PARTIAL") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((points / records.length) * 100);
}

export function computeHomeworkCompletionRate(records: { status: string }[]) {
  if (records.length === 0) return 0;
  const done = records.filter((r) => r.status === "SUBMITTED" || r.status === "REVIEWED").length;
  return Math.round((done / records.length) * 100);
}

/** Profile + taxonomy scope used by the AI Study Assistant (Phase 3A) to pitch answers at
 * the right level and to scope Knowledge Base retrieval. */
export async function getStudentAIContext(studentId: string) {
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      academicLevel: true,
      board: true,
      group: true,
      batchMemberships: { include: { batch: { include: { program: true, subjects: { include: { subject: true } } } } } },
    },
  });
  if (!student) return null;

  const subjectNames = Array.from(
    new Set(student.batchMemberships.flatMap((bm) => bm.batch.subjects.map((bs) => bs.subject.name)))
  );
  const programName = student.batchMemberships.find((bm) => bm.batch.program)?.batch.program?.name ?? null;

  return {
    academicLevelName: student.academicLevel.name,
    boardName: student.board?.name ?? null,
    groupName: student.group?.name ?? null,
    programName,
    subjectNames,
    scope: { academicLevelId: student.academicLevelId, boardId: student.boardId, groupId: student.groupId },
  };
}
