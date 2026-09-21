import "server-only";
import { db } from "@/lib/db";
import * as automationService from "@/lib/services/automation";
import * as recipients from "@/lib/services/automation-recipients";

const RULE_KEY = "LOW_TEST_SCORE" as const;
const DEFAULTS = { thresholdPercent: 40, repeatedCountForParentAlert: 2 };

/**
 * Called once a TestResult is fully graded (auto-graded or manually graded — see the
 * two call sites in tests.ts). Flags a below-threshold score for teacher review, and
 * escalates to the parent once the student has repeated the pattern.
 */
export async function checkLowTestScore(testId: string, studentId: string, marksObtained: number, totalMarks: number) {
  const { isActive, config } = await automationService.getRuleConfig(RULE_KEY, DEFAULTS);
  if (!isActive || totalMarks === 0) return;

  const percent = (marksObtained / totalMarks) * 100;
  if (percent >= config.thresholdPercent) return;

  const marker = `test:${testId}:student:${studentId}`;
  if (await automationService.hasFiredRecently(RULE_KEY, studentId, marker)) return;

  const [test, student, teacherContacts] = await Promise.all([
    db.test.findUniqueOrThrow({ where: { id: testId } }),
    db.student.findUniqueOrThrow({ where: { id: studentId } }),
    db.test.findUniqueOrThrow({ where: { id: testId } }).then((t) => recipients.getBatchTeacherContacts(t.batchId)),
  ]);

  await automationService.dispatchAlert({
    userIds: teacherContacts.map((c) => c.userId).filter((id): id is string => Boolean(id)),
    notificationType: "PERFORMANCE_ALERT",
    title: "Low test score",
    message: `${student.fullName} scored ${Math.round(percent)}% on "${test.name}" — below the ${config.thresholdPercent}% threshold.`,
    relatedEntityType: "Test",
    relatedEntityId: testId,
  });

  await automationService.logAutomation({
    ruleKey: RULE_KEY,
    studentId,
    action: `Scored ${Math.round(percent)}% on "${test.name}" (below ${config.thresholdPercent}%) — flagged for teacher review, added to academic attention list`,
    details: { marker, percent, testId },
  });

  const priorLowScores = await db.automationLog.count({ where: { ruleKey: RULE_KEY, studentId } });
  if (priorLowScores >= config.repeatedCountForParentAlert) {
    const contacts = await recipients.getStudentContacts(studentId);
    const variables = { student_name: student.fullName };
    await automationService.dispatchAlert({
      userIds: contacts.parents.map((p) => p.userId).filter((id): id is string => Boolean(id)),
      notificationType: "PERFORMANCE_ALERT",
      title: "Performance alert",
      message: `${student.fullName} needs additional support in ${test.name.includes(" ") ? "their studies" : test.name} — repeated low test scores.`,
      relatedEntityType: "Student",
      relatedEntityId: studentId,
      whatsapp: contacts.parents.map((p) => ({ phone: p.phone, userId: p.userId, templateKey: "AT_RISK_ALERT", variables })),
      email: contacts.parents.filter((p) => p.email).map((p) => ({ email: p.email!, userId: p.userId, templateKey: "AT_RISK_ALERT", variables })),
    });

    await automationService.logAutomation({
      ruleKey: RULE_KEY,
      studentId,
      action: `Repeated low scores (${priorLowScores + 1}) — notified parent`,
      details: { marker: `${marker}:parent-notified` },
    });
  }
}
