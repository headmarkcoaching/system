"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as gamificationService from "@/lib/services/gamification";

const PATH = "/admin/badges";

const badgeSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  iconUrl: z.string().optional(),
});

export async function createBadgeAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = badgeSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await gamificationService.createBadge(parsed.data);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "Badge", entityId: record.id, after: record });
  revalidatePath(PATH);
}

export async function updateBadgeAction(id: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = badgeSchema.partial().safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await gamificationService.updateBadge(id, parsed.data);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Badge", entityId: id, after: record });
  revalidatePath(PATH);
}

export async function awardBadgeAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const schema = z.object({ studentId: z.string().min(1, "Student is required"), badgeId: z.string().min(1, "Badge is required"), note: z.string().optional() });
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await gamificationService.awardBadge(parsed.data.studentId, parsed.data.badgeId, parsed.data.note);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "StudentBadge", entityId: record.id, after: record });
  revalidatePath(PATH);
  revalidatePath(`/students/${parsed.data.studentId}`);
}
