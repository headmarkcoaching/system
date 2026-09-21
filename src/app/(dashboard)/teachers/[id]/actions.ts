"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { STAFF_ROLES, ForbiddenError } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as staffService from "@/lib/services/staff";
import * as profilePhotoService from "@/lib/services/profile-photos";
import { FileValidationError } from "@/lib/services/uploaded-files";

async function assertCanEditTeacher(teacherId: string) {
  const session = await requireSession();
  if (STAFF_ROLES.includes(session.user.role)) return session;

  const teacher = await staffService.getTeacherById(teacherId);
  if (session.user.role === "TEACHER" && teacher?.userId === session.user.id) return session;

  throw new ForbiddenError();
}

const profileSchema = z.object({
  bio: z.string().optional(),
  qualification: z.string().optional(),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  specialization: z.string().optional(),
});

export async function updateTeacherProfileAction(teacherId: string, data: Record<string, unknown>) {
  const session = await assertCanEditTeacher(teacherId);
  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await staffService.updateTeacherProfile(teacherId, parsed.data);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Teacher", entityId: teacherId, after: record });
  revalidatePath(`/teachers/${teacherId}`);
}

export async function uploadTeacherPhotoAction(teacherId: string, formData: FormData) {
  const session = await assertCanEditTeacher(teacherId);
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file provided." };

  try {
    const photoUrl = await profilePhotoService.uploadProfilePhoto({ file, uploadedById: session.user.id });
    await staffService.updateTeacherPhoto(teacherId, photoUrl);
    revalidatePath(`/teachers/${teacherId}`);
    revalidatePath("/admin/teachers");
  } catch (err) {
    if (err instanceof FileValidationError) return { error: err.message };
    return { error: "Could not upload photo." };
  }
}
