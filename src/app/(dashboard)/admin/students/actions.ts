"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as studentService from "@/lib/services/students";

const createStudentSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  dateOfBirth: z.string().optional(),
  gender: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["MALE", "FEMALE", "OTHER"]).optional()),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  city: z.string().optional(),
  address: z.string().optional(),
  academicLevelId: z.string().min(1, "Academic level is required"),
  boardId: z.string().optional(),
  groupId: z.string().optional(),
  school: z.string().optional(),
  status: z.enum(["ACTIVE", "TRIAL", "PAYMENT_PENDING", "INACTIVE", "ALUMNI"]),
  enrollmentDate: z.string().optional(),
  createLogin: z.coerce.boolean().optional(),
  loginPassword: z.string().optional(),
});

export interface CreateStudentState {
  error?: string;
}

export async function createStudentAction(_prevState: CreateStudentState, formData: FormData): Promise<CreateStudentState> {
  const session = await requireRoleSession(STAFF_ROLES);

  const raw = Object.fromEntries(formData.entries());
  const parsed = createStudentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (parsed.data.createLogin && (!parsed.data.loginPassword || parsed.data.loginPassword.length < 6)) {
    return { error: "Set a login password of at least 6 characters, or turn off 'Create login'." };
  }
  if (parsed.data.createLogin && !parsed.data.email && !parsed.data.phone) {
    return { error: "Add an email or phone number to create a login." };
  }

  const student = await studentService.createStudent({ ...parsed.data, createdById: session.user.id });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "Student", entityId: student.id, after: student });

  revalidatePath("/admin/students");
  redirect(`/students/${student.id}`);
}

const updateStudentSchema = createStudentSchema.omit({ createLogin: true, loginPassword: true }).partial();

export async function updateStudentAction(id: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = updateStudentSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await studentService.updateStudent(id, parsed.data);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Student", entityId: id, after: record });

  revalidatePath(`/students/${id}`);
  revalidatePath("/admin/students");
}

export async function addStudentNoteAction(studentId: string, note: string) {
  const session = await requireRoleSession(STAFF_ROLES.concat("TEACHER"));
  if (!note.trim()) return { error: "Note cannot be empty." };

  await studentService.addStudentNote(studentId, session.user.id, note.trim());
  revalidatePath(`/students/${studentId}`);
}

export async function linkParentAction(studentId: string, parentId: string, relationship: string, isPrimary: boolean) {
  const session = await requireRoleSession(STAFF_ROLES);
  await studentService.linkParentToStudent(studentId, parentId, relationship, isPrimary);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Student", entityId: studentId, after: { linkedParentId: parentId } });
  revalidatePath(`/students/${studentId}`);
}

export async function unlinkParentAction(studentId: string, parentId: string) {
  const session = await requireRoleSession(STAFF_ROLES);
  await studentService.unlinkParentFromStudent(studentId, parentId);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Student", entityId: studentId, after: { unlinkedParentId: parentId } });
  revalidatePath(`/students/${studentId}`);
}
