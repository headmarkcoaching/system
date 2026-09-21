import "server-only";
import { db } from "@/lib/db";
import { getAIProvider } from "@/lib/ai";
import * as studentService from "@/lib/services/students";
import * as performanceService from "@/lib/services/performance";
import { logAIInteraction } from "@/lib/services/ai-common";

export async function generateParentReport(studentId: string, periodStart: Date, periodEnd: Date) {
  const [attendance, homework, latestPerformance] = await Promise.all([
    db.attendance.findMany({ where: { studentId, date: { gte: periodStart, lte: periodEnd } } }),
    db.homeworkSubmission.findMany({ where: { studentId, homework: { dueDate: { gte: periodStart, lte: periodEnd } } } }),
    performanceService.getLatestPerformance(studentId),
  ]);

  const attendancePercent = studentService.computeAttendanceRate(attendance);
  const homeworkCompletionPercent = studentService.computeHomeworkCompletionRate(homework);
  const classesAttended = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;

  return db.parentReport.create({
    data: {
      studentId,
      periodStart,
      periodEnd,
      attendancePercent,
      classesAttended,
      homeworkCompletionPercent,
      overallScore: latestPerformance?.overallScore,
    },
  });
}

export async function updateParentReport(id: string, data: { teacherFeedback?: string; weakAreas?: string; nextWeekGoal?: string }) {
  const existing = await db.parentReport.findUnique({ where: { id }, select: { aiDrafted: true } });
  return db.parentReport.update({
    where: { id },
    // Editing AI-drafted content invalidates the prior approval — it needs a fresh human review.
    // Reports never run through AI (aiDrafted === false) keep today's no-friction manual flow.
    data: { ...data, approvedAt: existing?.aiDrafted ? null : undefined },
  });
}

export function markSent(id: string) {
  return db.parentReport.update({ where: { id }, data: { sentAt: new Date() } });
}

export function listForStudent(studentId: string) {
  return db.parentReport.findMany({ where: { studentId }, orderBy: { generatedAt: "desc" } });
}

export function approveParentReport(id: string, approvedById: string) {
  return db.parentReport.update({ where: { id }, data: { approvedAt: new Date(), approvedById } });
}

/** AI-drafts teacherFeedback/weakAreas/nextWeekGoal from the report's own stats + performance
 * history. Never called by the automated weekly job — reserved for the manual, staff-triggered
 * flow where a human approval gate applies before the report can be sent. */
export async function draftParentReportNarrative(reportId: string, requestedByUserId: string) {
  const report = await db.parentReport.findUniqueOrThrow({ where: { id: reportId } });
  const [student, history] = await Promise.all([
    db.student.findUniqueOrThrow({ where: { id: report.studentId }, select: { fullName: true } }),
    performanceService.getPerformanceHistory(report.studentId),
  ]);

  const prompt = buildPrompt({ report, studentName: student.fullName, history });
  const provider = getAIProvider();
  const start = Date.now();
  const result = await provider.complete({
    messages: [
      {
        role: "system",
        content: "You write short, clear, supportive, non-technical progress notes for parents at an online tutoring academy. Never invent statistics beyond what's given. Do not simply restate raw numbers — explain what they mean.",
      },
      { role: "user", content: prompt },
    ],
    maxTokens: 500,
  });
  const latencyMs = Date.now() - start;

  await logAIInteraction({
    userId: requestedByUserId,
    conversationId: `parent-report-draft:${reportId}`,
    feature: "PARENT_REPORT_DRAFT",
    provider: result.provider,
    model: result.model,
    prompt,
    response: result.status === "SUCCESS" ? result.text : undefined,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    latencyMs,
    status: result.status,
    errorMessage: result.status === "FAILED" ? result.errorMessage : undefined,
  });

  if (result.status === "FAILED") {
    throw new Error(result.errorMessage ?? "Couldn't draft the report. Please try again.");
  }

  const parsed = parseNarrative(result.text ?? "");
  return db.parentReport.update({
    where: { id: reportId },
    data: { ...parsed, aiDrafted: true, approvedAt: null, approvedById: null },
  });
}

function buildPrompt({
  report,
  studentName,
  history,
}: {
  report: { attendancePercent: number; homeworkCompletionPercent: number; overallScore: number | null };
  studentName: string;
  history: Awaited<ReturnType<typeof performanceService.getPerformanceHistory>>;
}): string {
  const trend = history.length > 1 ? `Recent overall scores, most recent first: ${history.map((h) => h.overallScore).join(", ")}.` : "Not enough history for a trend yet.";

  return [
    `Student: ${studentName}.`,
    `This period: ${Math.round(report.attendancePercent)}% attendance, ${Math.round(report.homeworkCompletionPercent)}% homework completion, overall score ${report.overallScore ?? "not yet calculated"}.`,
    trend,
    "",
    "Write exactly these three labeled sections, each 1-2 short sentences, in a warm and supportive tone a parent (not a teacher) will read:",
    "FEEDBACK:",
    "WEAK AREAS:",
    "NEXT WEEK GOAL:",
  ].join("\n");
}

function parseNarrative(text: string): { teacherFeedback?: string; weakAreas?: string; nextWeekGoal?: string } {
  const extract = (label: string, nextLabels: string[]) => {
    const pattern = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=${nextLabels.map((l) => `${l}:`).join("|")}|$)`, "i");
    const match = text.match(pattern);
    return match?.[1]?.trim() || undefined;
  };

  const teacherFeedback = extract("FEEDBACK", ["WEAK AREAS", "NEXT WEEK GOAL"]);
  const weakAreas = extract("WEAK AREAS", ["NEXT WEEK GOAL", "FEEDBACK"]);
  const nextWeekGoal = extract("NEXT WEEK GOAL", ["FEEDBACK", "WEAK AREAS"]);

  // If the response didn't use the labeled-section format (e.g. the zero-config console
  // provider's generic placeholder, which has no knowledge-base excerpt to echo here since
  // Parent Reports intentionally isn't KB-grounded), fall back to showing the raw text rather
  // than silently leaving the draft blank despite a "successful" generation.
  if (!teacherFeedback && !weakAreas && !nextWeekGoal) {
    return { teacherFeedback: text.trim() || undefined };
  }

  return { teacherFeedback, weakAreas, nextWeekGoal };
}
