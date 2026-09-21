"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as gamificationService from "@/lib/services/gamification";

const configSchema = z.object({
  pointsForAttendance: z.coerce.number().int().min(0),
  pointsForPerfectWeek: z.coerce.number().int().min(0),
  pointsForHomeworkSubmit: z.coerce.number().int().min(0),
  pointsForHomeworkReviewed: z.coerce.number().int().min(0),
  pointsForHighTestScore: z.coerce.number().int().min(0),
  highTestScoreThreshold: z.coerce.number().int().min(0).max(100),
  pointsForParticipation: z.coerce.number().int().min(0),
  pointsForStudyStreak: z.coerce.number().int().min(0),
  studyStreakDays: z.coerce.number().int().min(1),
});

export async function updatePointsConfigAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = configSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await gamificationService.updatePointsConfig(parsed.data, session.user.id);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "PointsConfig", entityId: record.id, after: record });

  revalidatePath("/admin/settings/gamification");
}
