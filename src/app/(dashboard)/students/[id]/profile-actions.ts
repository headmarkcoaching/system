"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { STAFF_ROLES, ForbiddenError } from "@/lib/permissions";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import * as classAccessService from "@/lib/services/class-access";
import * as studentService from "@/lib/services/students";
import * as profilePhotoService from "@/lib/services/profile-photos";
import { FileValidationError } from "@/lib/services/uploaded-files";

async function assertCanEditStudent(studentId: string) {
  const session = await requireSession();
  if (STAFF_ROLES.includes(session.user.role)) return session;

  if (session.user.role === "STUDENT") {
    const student = await db.student.findUnique({ where: { id: studentId }, select: { userId: true } });
    if (student?.userId === session.user.id) return session;
  }

  throw new ForbiddenError();
}

export async function uploadStudentPhotoAction(studentId: string, formData: FormData) {
  const session = await assertCanEditStudent(studentId);
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file provided." };

  try {
    const photoUrl = await profilePhotoService.uploadProfilePhoto({ file, uploadedById: session.user.id });
    await studentService.updateStudentPhoto(studentId, photoUrl);
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/admin/students");
  } catch (err) {
    if (err instanceof FileValidationError) return { error: err.message };
    return { error: "Could not upload photo." };
  }
}

// Staff only: let a student join live classes despite an overdue fee, for a number of days (for example
// a family that has promised to pay tomorrow). 0 removes the exception. Logged, so it can be reviewed.
export async function setClassAccessOverrideAction(studentId: string, days: number) {
  const session = await requireSession();
  if (!STAFF_ROLES.includes(session.user.role)) throw new ForbiddenError();
  if (!Number.isInteger(days) || days < 0 || days > 30) return { error: "Choose between 0 and 30 days." };

  const until = await classAccessService.setClassAccessOverride(studentId, days);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Student", entityId: studentId, after: { classAccessOverrideUntil: until } });
  revalidatePath(`/students/${studentId}`);
  return {};
}
