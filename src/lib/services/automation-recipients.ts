import "server-only";
import { db } from "@/lib/db";

export async function getStaffUserIds() {
  const staff = await db.user.findMany({ where: { roleKey: { in: ["SUPER_ADMIN", "ADMIN"] } }, select: { id: true } });
  return staff.map((s) => s.id);
}

export interface ContactPoint {
  userId?: string;
  phone: string;
  email?: string;
}

/** The student's own contact (if they have a login + phone) and every linked parent's contact. */
export async function getStudentContacts(studentId: string) {
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { parents: { include: { parent: true } } },
  });
  if (!student) return { studentUserId: undefined as string | undefined, student: null as ContactPoint | null, parents: [] as ContactPoint[] };

  const studentContact: ContactPoint | null =
    student.userId && (student.whatsapp || student.phone) ? { userId: student.userId, phone: (student.whatsapp || student.phone)!, email: student.email ?? undefined } : null;

  const parents: ContactPoint[] = student.parents
    .map((rel) => rel.parent)
    .filter((p) => p.whatsapp || p.phone)
    .map((p) => ({ userId: p.userId ?? undefined, phone: (p.whatsapp || p.phone)!, email: p.email ?? undefined }));

  return { studentUserId: student.userId ?? undefined, student: studentContact, parents, fullName: student.fullName };
}

export async function getBatchTeacherContacts(batchId: string) {
  const assignments = await db.batchTeacher.findMany({ where: { batchId }, include: { teacher: true } });
  const seen = new Set<string>();
  const contacts: ContactPoint[] = [];
  for (const a of assignments) {
    if (seen.has(a.teacher.userId)) continue;
    seen.add(a.teacher.userId);
    const phone = a.teacher.phone;
    if (phone) contacts.push({ userId: a.teacher.userId, phone, email: a.teacher.email ?? undefined });
  }
  return contacts;
}

export async function getCounselorContact(counselorId: string | null | undefined) {
  if (!counselorId) return null;
  const counselor = await db.counselor.findUnique({ where: { id: counselorId } });
  if (!counselor || !counselor.phone) return { userId: counselor?.userId, phone: undefined as string | undefined, email: counselor?.email ?? undefined };
  return { userId: counselor.userId, phone: counselor.phone, email: counselor.email ?? undefined };
}
