"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { ACADEMIC_STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import * as parentReportService from "@/lib/services/parent-reports";

export async function generateParentReportAction(studentId: string) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);

  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 7);

  const report = await parentReportService.generateParentReport(studentId, periodStart, periodEnd);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "ParentReport", entityId: report.id, after: report });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/parent");
}

const updateSchema = z.object({
  teacherFeedback: z.string().optional(),
  weakAreas: z.string().optional(),
  nextWeekGoal: z.string().optional(),
});

export async function updateParentReportAction(studentId: string, reportId: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = updateSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const report = await parentReportService.updateParentReport(reportId, parsed.data);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "ParentReport", entityId: reportId, after: report });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/parent");
}

export async function markParentReportSentAction(studentId: string, reportId: string) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);

  const report = await db.parentReport.findUniqueOrThrow({ where: { id: reportId } });
  if (report.aiDrafted && !report.approvedAt) {
    return { error: "Approve this AI-drafted report before sending." };
  }

  await parentReportService.markSent(reportId);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "ParentReport", entityId: reportId, after: { sent: true } });
  revalidatePath(`/students/${studentId}`);
}

export async function draftParentReportNarrativeAction(studentId: string, reportId: string) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const report = await parentReportService.draftParentReportNarrative(reportId, session.user.id);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "ParentReport", entityId: reportId, after: report });
  revalidatePath(`/students/${studentId}`);
  return report;
}

export async function approveParentReportAction(studentId: string, reportId: string) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const report = await parentReportService.approveParentReport(reportId, session.user.id);
  await logAudit({ actorId: session.user.id, action: "STATUS_CHANGE", entityType: "ParentReport", entityId: reportId, after: { approved: true } });
  revalidatePath(`/students/${studentId}`);
  return report;
}
