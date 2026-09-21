"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { ACADEMIC_STAFF_ROLES } from "@/lib/permissions";
import { assertCanManageBatch } from "@/lib/access";
import { logAudit } from "@/lib/audit";
import * as announcementService from "@/lib/services/announcements";

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  message: z.string().min(2, "Message is required"),
  audience: z.enum(["ALL_STUDENTS", "ACADEMIC_LEVEL", "BATCH", "PARENTS", "TEACHERS"]),
  academicLevelId: z.string().optional(),
  batchId: z.string().optional(),
});

export async function createAnnouncementAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (parsed.data.audience === "ACADEMIC_LEVEL" && !parsed.data.academicLevelId) {
    return { error: "Select an academic level for this audience." };
  }
  if (parsed.data.audience === "BATCH" && !parsed.data.batchId) {
    return { error: "Select a batch for this audience." };
  }

  const announcement = await announcementService.createAnnouncement({ ...parsed.data, createdById: session.user.id });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "Announcement", entityId: announcement.id, after: announcement });

  revalidatePath("/admin/communication");
  revalidatePath("/admin");
  revalidatePath("/teacher");
  revalidatePath("/student");
  revalidatePath("/parent");
  if (parsed.data.batchId) revalidatePath(`/batches/${parsed.data.batchId}`);
}

export async function createBatchAnnouncementAction(batchId: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageBatch(session, batchId);
  return createAnnouncementAction({ ...data, audience: "BATCH", batchId });
}
