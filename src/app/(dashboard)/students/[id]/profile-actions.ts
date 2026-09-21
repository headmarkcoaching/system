"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { STAFF_ROLES, ForbiddenError } from "@/lib/permissions";
import { db } from "@/lib/db";
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
