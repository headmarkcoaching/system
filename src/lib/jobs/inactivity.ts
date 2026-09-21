import "server-only";
import { db } from "@/lib/db";
import * as automationService from "@/lib/services/automation";
import * as recipients from "@/lib/services/automation-recipients";

const RULE_KEY = "STUDENT_INACTIVITY" as const;
const DEFAULTS = { inactiveDays: 7 };

/** Rule 5: no login for N days -> notify student + parent, surface on admin engagement dashboard. */
export async function runInactivityCheck(now = new Date()) {
  const { isActive, config } = await automationService.getRuleConfig(RULE_KEY, DEFAULTS);
  if (!isActive) {
    await automationService.logAutomation({ ruleKey: RULE_KEY, action: "Rule disabled — skipped", status: "SKIPPED" });
    return { processed: 0 };
  }

  const threshold = new Date(now.getTime() - config.inactiveDays * 86_400_000);

  const students = await db.student.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIAL"] },
      user: { OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: threshold } }] },
    },
    include: { user: true },
  });

  let processed = 0;

  for (const student of students) {
    if (!student.user) continue;
    // The marker is derived from lastLoginAt so a fresh login naturally resets the streak,
    // and re-notifying doesn't happen on every job run for the same ongoing absence.
    const marker = `since:${student.user.lastLoginAt?.toISOString() ?? "never"}`;
    if (await automationService.hasFiredRecently(RULE_KEY, student.id, marker)) continue;

    const contacts = await recipients.getStudentContacts(student.id);
    const staffUserIds = await recipients.getStaffUserIds();

    const variables = { student_name: student.fullName };
    await automationService.dispatchAlert({
      userIds: [...(contacts.studentUserId ? [contacts.studentUserId] : []), ...contacts.parents.map((p) => p.userId).filter((id): id is string => Boolean(id)), ...staffUserIds],
      notificationType: "INACTIVITY_ALERT",
      title: "We miss you!",
      message: `${student.fullName} hasn't logged in for ${config.inactiveDays}+ days.`,
      relatedEntityType: "Student",
      relatedEntityId: student.id,
      whatsapp: contacts.parents.map((p) => ({ phone: p.phone, userId: p.userId, templateKey: "AT_RISK_ALERT", variables })),
      email: contacts.parents.filter((p) => p.email).map((p) => ({ email: p.email!, userId: p.userId, templateKey: "AT_RISK_ALERT", variables })),
    });

    await automationService.logAutomation({
      ruleKey: RULE_KEY,
      studentId: student.id,
      action: `No login for ${config.inactiveDays}+ days — notified student, parent, and admin engagement dashboard`,
      details: { marker },
    });
    processed++;
  }

  return { processed };
}
