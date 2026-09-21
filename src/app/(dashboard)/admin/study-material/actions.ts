"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { ACADEMIC_STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as studyMaterialService from "@/lib/services/study-material";
import * as uploadedFilesService from "@/lib/services/uploaded-files";

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  type: z.enum(["PDF", "NOTES", "PAST_PAPER", "WORKSHEET", "ASSIGNMENT"]),
  academicLevelId: z.string().min(1, "Academic level is required"),
  subjectId: z.string().min(1, "Subject is required"),
  chapter: z.string().optional(),
});

function revalidateStudyMaterial(levelId?: string) {
  revalidatePath("/admin/study-material");
  if (levelId) revalidatePath(`/admin/study-material/${levelId}`);
  revalidatePath("/student/study-material");
}

// Uploaded (not linked) so it can be served view-only through /api/files/[id] — a pasted external
// link (the old behavior) can never be prevented from being downloaded, since the app doesn't
// control how that other site serves the file. FormData, not a plain object, because a File can't
// cross the client->server-action boundary any other way — same pattern as homework submissions.
export async function createStudyMaterialAction(formData: FormData, levelId?: string) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = schema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    academicLevelId: formData.get("academicLevelId"),
    subjectId: formData.get("subjectId"),
    chapter: formData.get("chapter") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a PDF or image file to upload." };

  let uploaded;
  try {
    uploaded = await uploadedFilesService.uploadFile({ file, purpose: "STUDY_MATERIAL", uploadedById: session.user.id });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not upload the file." };
  }

  const record = await studyMaterialService.createStudyMaterial({ ...parsed.data, fileId: uploaded.id, uploadedById: session.user.id });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "StudyMaterial", entityId: record.id, after: record });
  revalidateStudyMaterial(levelId);
}

export async function deleteStudyMaterialAction(id: string, levelId?: string) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await studyMaterialService.deleteStudyMaterial(id);
  await logAudit({ actorId: session.user.id, action: "DELETE", entityType: "StudyMaterial", entityId: id });
  revalidateStudyMaterial(levelId);
}
