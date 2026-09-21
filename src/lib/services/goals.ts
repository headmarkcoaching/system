import "server-only";
import { db } from "@/lib/db";
import type { GoalType, GoalMetric } from "@prisma/client";
import * as studentService from "@/lib/services/students";
import * as performanceService from "@/lib/services/performance";
import * as learningAnalyticsService from "@/lib/services/learning-analytics";

export interface CreateGoalInput {
  studentId: string;
  type: GoalType;
  metric: GoalMetric;
  subjectId?: string;
  title: string;
  targetValue: number;
  targetDate: string;
  createdById: string;
}

/** currentValue is always derived live (never stored) from the same services Performance and
 * Learning Analytics already compute from, so a goal can never drift out of sync with the real
 * number it tracks. All four metrics here are "higher is better," matching the spec's own
 * example ("improve Mathematics score from 55% to 70%") — a goal always tracks improvement
 * toward a higher target than its startValue. */
async function deriveCurrentValue(studentId: string, metric: GoalMetric, subjectId: string | null): Promise<number> {
  switch (metric) {
    case "OVERALL_PERFORMANCE": {
      const latest = await performanceService.getLatestPerformance(studentId);
      return latest?.overallScore ?? 0;
    }
    case "ATTENDANCE": {
      const records = await studentService.getStudentAttendance(studentId);
      return studentService.computeAttendanceRate(records);
    }
    case "HOMEWORK_COMPLETION": {
      const records = await studentService.getStudentHomework(studentId);
      return studentService.computeHomeworkCompletionRate(records);
    }
    case "SUBJECT_TEST_SCORE": {
      if (!subjectId) return 0;
      const { subjects } = await learningAnalyticsService.getStudentLearningAnalytics(studentId);
      return subjects.find((s) => s.subjectId === subjectId)?.average ?? 0;
    }
  }
}

export async function createGoal(input: CreateGoalInput) {
  const startValue = await deriveCurrentValue(input.studentId, input.metric, input.subjectId ?? null);
  return db.studentGoal.create({
    data: {
      studentId: input.studentId,
      type: input.type,
      metric: input.metric,
      subjectId: input.subjectId || undefined,
      title: input.title,
      startValue,
      targetValue: input.targetValue,
      startDate: new Date(),
      targetDate: new Date(input.targetDate),
      createdById: input.createdById,
    },
  });
}

export function cancelGoal(id: string) {
  return db.studentGoal.update({ where: { id }, data: { status: "CANCELLED" } });
}

export interface GoalWithProgress {
  id: string;
  title: string;
  type: GoalType;
  metric: GoalMetric;
  subject: { name: string } | null;
  startValue: number;
  targetValue: number;
  currentValue: number;
  targetDate: Date;
  effectiveStatus: "ACTIVE" | "ACHIEVED" | "MISSED" | "CANCELLED";
}

export async function listGoalsForStudent(studentId: string): Promise<GoalWithProgress[]> {
  const goals = await db.studentGoal.findMany({ where: { studentId }, include: { subject: true }, orderBy: { createdAt: "desc" } });
  const now = new Date();

  return Promise.all(
    goals.map(async (g) => {
      const currentValue = await deriveCurrentValue(studentId, g.metric, g.subjectId);
      const effectiveStatus: GoalWithProgress["effectiveStatus"] =
        g.status === "CANCELLED" ? "CANCELLED" : currentValue >= g.targetValue ? "ACHIEVED" : now > g.targetDate ? "MISSED" : "ACTIVE";

      return {
        id: g.id,
        title: g.title,
        type: g.type,
        metric: g.metric,
        subject: g.subject,
        startValue: g.startValue,
        targetValue: g.targetValue,
        currentValue,
        targetDate: g.targetDate,
        effectiveStatus,
      };
    })
  );
}
