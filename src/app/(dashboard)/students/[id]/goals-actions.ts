"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { ACADEMIC_STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as goalsService from "@/lib/services/goals";

const goalSchema = z.object({
  type: z.enum(["WEEKLY", "MONTHLY", "EXAM"]),
  metric: z.enum(["SUBJECT_TEST_SCORE", "OVERALL_PERFORMANCE", "ATTENDANCE", "HOMEWORK_COMPLETION"]),
  subjectId: z.string().optional(),
  title: z.string().min(2, "Title is required"),
  targetValue: z.coerce.number().min(0).max(100),
  targetDate: z.string().min(1, "Target date is required"),
});

export async function createGoalAction(studentId: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = goalSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.metric === "SUBJECT_TEST_SCORE" && !parsed.data.subjectId) {
    return { error: "Select a subject for a Subject Test Score goal." };
  }

  const record = await goalsService.createGoal({ studentId, createdById: session.user.id, ...parsed.data });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "StudentGoal", entityId: record.id, after: record });
  revalidatePath(`/students/${studentId}`);
}

export async function cancelGoalAction(goalId: string, studentId: string) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await goalsService.cancelGoal(goalId);
  await logAudit({ actorId: session.user.id, action: "STATUS_CHANGE", entityType: "StudentGoal", entityId: goalId, after: { status: "CANCELLED" } });
  revalidatePath(`/students/${studentId}`);
}
