import "server-only";
import { db } from "@/lib/db";
import * as automationService from "@/lib/services/automation";
import * as recipients from "@/lib/services/automation-recipients";
import * as parentReportService from "@/lib/services/parent-reports";

const RULE_KEY = "WEEKLY_PARENT_REPORT" as const;
const DEFAULTS = {};

/** Weekly Parent Report automation: calls the existing (Phase 3) manual report generator on a schedule. */
export async function runWeeklyParentReports(now = new Date()) {
  const { isActive } = await automationService.getRuleConfig(RULE_KEY, DEFAULTS);
  if (!isActive) {
    await automationService.logAutomation({ ruleKey: RULE_KEY, action: "Rule disabled — skipped", status: "SKIPPED" });
    return { processed: 0 };
  }

  const periodEnd = now;
  const periodStart = new Date(now.getTime() - 7 * 86_400_000);
  const weekMarkerDate = periodEnd.toISOString().slice(0, 10); // one report per calendar day this job actually runs

  const students = await db.student.findMany({ where: { status: { in: ["ACTIVE", "TRIAL"] } } });
  let processed = 0;

  for (const student of students) {
    const marker = `week:${weekMarkerDate}:student:${student.id}`;
    if (await automationService.hasFiredRecently(RULE_KEY, student.id, marker)) continue;

    const report = await parentReportService.generateParentReport(student.id, periodStart, periodEnd);
    const contacts = await recipients.getStudentContacts(student.id);

    const variables = { student_name: student.fullName };
    await automationService.dispatchAlert({
      userIds: contacts.parents.map((p) => p.userId).filter((id): id is string => Boolean(id)),
      notificationType: "PERFORMANCE_ALERT",
      title: "Weekly progress report",
      message: `${student.fullName}'s weekly report is ready: ${Math.round(report.attendancePercent)}% attendance, ${Math.round(report.homeworkCompletionPercent)}% homework completion.`,
      relatedEntityType: "ParentReport",
      relatedEntityId: report.id,
      whatsapp: contacts.parents.map((p) => ({ phone: p.phone, userId: p.userId, templateKey: "WEEKLY_PARENT_REPORT", variables })),
      email: contacts.parents.filter((p) => p.email).map((p) => ({ email: p.email!, userId: p.userId, templateKey: "WEEKLY_PARENT_REPORT", variables })),
    });

    await parentReportService.markSent(report.id);
    await automationService.logAutomation({ ruleKey: RULE_KEY, studentId: student.id, action: "Weekly report generated and sent to parent", details: { marker, reportId: report.id } });
    processed++;
  }

  return { processed };
}
