"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as performanceService from "@/lib/services/performance";

const configSchema = z.object({
  attendanceWeight: z.coerce.number().int().min(0).max(100),
  homeworkWeight: z.coerce.number().int().min(0).max(100),
  testWeight: z.coerce.number().int().min(0).max(100),
  participationWeight: z.coerce.number().int().min(0).max(100),
  excellentThreshold: z.coerce.number().int().min(0).max(100),
  progressingThreshold: z.coerce.number().int().min(0).max(100),
  needsAttentionThreshold: z.coerce.number().int().min(0).max(100),
  atRiskAttendanceBelow: z.coerce.number().int().min(0).max(100),
  atRiskHomeworkBelow: z.coerce.number().int().min(0).max(100),
  atRiskTestBelow: z.coerce.number().int().min(0).max(100),
});

export async function updatePerformanceConfigAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = configSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const weightSum = parsed.data.attendanceWeight + parsed.data.homeworkWeight + parsed.data.testWeight + parsed.data.participationWeight;
  if (weightSum !== 100) return { error: `The four weights must add up to 100 (currently ${weightSum}).` };

  const record = await performanceService.updatePerformanceConfig(parsed.data, session.user.id);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "PerformanceConfig", entityId: record.id, after: record });

  revalidatePath("/admin/settings/performance");
}
