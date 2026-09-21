"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession, requireSession } from "@/lib/session";
import { ACADEMIC_STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as performanceService from "@/lib/services/performance";
import * as participationService from "@/lib/services/participation";
import * as performanceAnalysisService from "@/lib/services/performance-analysis";
import { db } from "@/lib/db";

export async function recalculatePerformanceAction(studentId: string, batchId: string | null) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);

  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 30);

  const { record } = await performanceService.calculateStudentPerformance(studentId, batchId, periodStart, periodEnd);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "StudentPerformance", entityId: record.id, after: record });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/admin/at-risk");
  revalidatePath("/admin");
  revalidatePath("/teacher");
}

const participationSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  note: z.string().optional(),
});

export async function recordParticipationAction(studentId: string, batchId: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = participationSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 30);

  const record = await participationService.recordParticipationScore({
    studentId,
    batchId,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    score: parsed.data.score,
    note: parsed.data.note,
    recordedById: session.user.id,
  });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "ParticipationScore", entityId: record.id, after: record });

  revalidatePath(`/students/${studentId}`);
}

/** Student self, or ACADEMIC_STAFF_ROLES. Parents get read-only visibility (no trigger). */
export async function generatePerformanceAnalysisAction(studentId: string, force: boolean) {
  const session = await requireSession();
  const isSelf = session.user.role === "STUDENT" && (await db.student.findUnique({ where: { id: studentId }, select: { userId: true } }))?.userId === session.user.id;
  if (!isSelf && !ACADEMIC_STAFF_ROLES.includes(session.user.role)) {
    throw new Error("You do not have permission to generate this analysis.");
  }

  const result = await performanceAnalysisService.generatePerformanceAnalysis(studentId, { requestedByUserId: session.user.id, force });
  revalidatePath(`/students/${studentId}`);
  return result;
}
