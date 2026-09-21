"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as engagementService from "@/lib/services/engagement";
import * as interventionsService from "@/lib/services/interventions";
import * as riskService from "@/lib/services/predictive-risk";
import * as teacherAssistantService from "@/lib/services/teacher-assistant";

export async function recalculateEngagementAction(studentId: string) {
  const session = await requireRoleSession(STAFF_ROLES);
  const record = await engagementService.calculateEngagementScore(studentId);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "EngagementScore", entityId: record.id, after: record });
  revalidatePath(`/students/${studentId}`);
}

export async function recalculateRiskAction(studentId: string) {
  const session = await requireRoleSession(STAFF_ROLES);
  const record = await riskService.calculatePredictiveRiskScore(studentId);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "PredictiveRiskScore", entityId: record.id, after: record });
  revalidatePath(`/students/${studentId}`);
  return record;
}

export async function suggestInterventionPlanAction(studentId: string) {
  const session = await requireRoleSession(STAFF_ROLES);
  return teacherAssistantService.suggestInterventionPlan(studentId, session.user.id);
}

const interventionSchema = z.object({
  reason: z.string().min(2, "Reason is required"),
  actionPlan: z.string().min(2, "Action plan is required"),
  responsibleStaffId: z.string().min(1, "Responsible staff is required"),
  startDate: z.string().min(1, "Start date is required"),
  reviewDate: z.string().min(1, "Review date is required"),
});

export async function createInterventionAction(studentId: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = interventionSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await interventionsService.createIntervention({
    studentId,
    ...parsed.data,
    createdById: session.user.id,
  });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "Intervention", entityId: record.id, after: record });
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/admin/at-risk");
  revalidatePath("/admin/interventions");
}

export async function updateInterventionStatusAction(interventionId: string, status: string, studentId: string) {
  const session = await requireRoleSession(STAFF_ROLES);
  const record = await interventionsService.updateIntervention(interventionId, { status: status as never });
  await logAudit({ actorId: session.user.id, action: "STATUS_CHANGE", entityType: "Intervention", entityId: interventionId, after: { status } });
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/admin/interventions");
}
