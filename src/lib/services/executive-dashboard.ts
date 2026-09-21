import "server-only";
import { db } from "@/lib/db";
import * as analyticsService from "@/lib/services/analytics";
import * as performanceService from "@/lib/services/performance";
import * as systemHealthService from "@/lib/services/system-health";
import * as aiUsageService from "@/lib/services/ai-usage";

/** Executive Super Dashboard — a pure rollup of numbers every earlier phase already computes
 * (Business/Marketing from 4B, At-Risk from Phase 2, Automation/WhatsApp from 4A, AI Usage from
 * this phase's new reporting layer) plus one small new direct query for Teacher Operations,
 * which nothing existing aggregates academy-wide (teacherAnalytics() is per-teacher only). No
 * new business logic beyond that one query — this page answers "how is the whole academy
 * doing today," not "how is this one thing doing." */
export async function getExecutiveDashboard() {
  const [business, academic, retention, atRisk, teacherOps, health, aiUsage, whatsappCounts] = await Promise.all([
    analyticsService.businessMetrics(),
    analyticsService.academicAnalytics(),
    analyticsService.retentionAnalytics(),
    performanceService.listAtRiskStudents(),
    getTeacherOperationsSummary(),
    systemHealthService.getSystemHealthSummary(),
    aiUsageService.getAIUsageSummary(),
    getWhatsAppDeliverySummary(),
  ]);

  return { business, academic, retention, atRiskCount: atRisk.length, teacherOps, health, aiUsage, whatsappCounts };
}

async function getTeacherOperationsSummary() {
  const [teacherCount, homeworkSubs] = await Promise.all([
    db.teacher.count(),
    db.homeworkSubmission.findMany({ select: { status: true, teacherFeedback: true } }),
  ]);

  const reviewed = homeworkSubs.filter((s) => s.status === "REVIEWED");
  const withFeedback = reviewed.filter((s) => s.teacherFeedback);

  return {
    teacherCount,
    homeworkReviewRate: homeworkSubs.length === 0 ? 0 : Math.round((reviewed.length / homeworkSubs.length) * 100),
    feedbackCompletionRate: reviewed.length === 0 ? 0 : Math.round((withFeedback.length / reviewed.length) * 100),
  };
}

async function getWhatsAppDeliverySummary() {
  const messages = await db.whatsAppMessage.groupBy({ by: ["status"], _count: true });
  const byStatus = new Map(messages.map((m) => [m.status, m._count]));
  return {
    sent: byStatus.get("SENT") ?? 0,
    delivered: byStatus.get("DELIVERED") ?? 0,
    failed: byStatus.get("FAILED") ?? 0,
    queued: byStatus.get("QUEUED") ?? 0,
  };
}
