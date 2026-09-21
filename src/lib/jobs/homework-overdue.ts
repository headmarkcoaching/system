import "server-only";
import { db } from "@/lib/db";
import * as automationService from "@/lib/services/automation";
import * as recipients from "@/lib/services/automation-recipients";

const RULE_KEY = "HOMEWORK_OVERDUE" as const;
const DEFAULTS = { teacherNotifyAfterDays: 2, parentNotifyAfterDays: 5 };

function daysSince(date: Date, now: Date) {
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

/** Rule 2: homework due date passes -> student, then (2d) teacher, then (configurable) parent. */
export async function runHomeworkOverdueCheck(now = new Date()) {
  const { isActive, config } = await automationService.getRuleConfig(RULE_KEY, DEFAULTS);
  if (!isActive) {
    await automationService.logAutomation({ ruleKey: RULE_KEY, action: "Rule disabled — skipped", status: "SKIPPED" });
    return { processed: 0 };
  }

  const overdue = await db.homeworkSubmission.findMany({
    where: { status: "PENDING", homework: { dueDate: { lt: now } } },
    include: { homework: { include: { batch: true, subject: true } }, student: true },
  });

  let processed = 0;

  for (const submission of overdue) {
    const overdueDays = daysSince(submission.homework.dueDate, now);
    const contacts = await recipients.getStudentContacts(submission.studentId);

    // Stage 1: student reminder (fires as soon as it's overdue).
    const studentMarker = `hw:${submission.id}:student`;
    if (!(await automationService.hasFiredRecently(RULE_KEY, submission.studentId, studentMarker))) {
      const variables = { student_name: submission.student.fullName, subject: submission.homework.subject.name };
      await automationService.dispatchAlert({
        userIds: contacts.studentUserId ? [contacts.studentUserId] : [],
        notificationType: "HOMEWORK_REMINDER",
        title: "Homework overdue",
        message: `"${submission.homework.title}" was due and hasn't been submitted yet.`,
        relatedEntityType: "Homework",
        relatedEntityId: submission.homework.id,
        whatsapp: contacts.student ? [{ phone: contacts.student.phone, userId: contacts.student.userId, templateKey: "HOMEWORK_REMINDER", variables }] : [],
        email: contacts.student?.email ? [{ email: contacts.student.email, userId: contacts.student.userId, templateKey: "HOMEWORK_REMINDER", variables }] : [],
      });
      await automationService.logAutomation({ ruleKey: RULE_KEY, studentId: submission.studentId, action: `"${submission.homework.title}" overdue — reminded student`, details: { marker: studentMarker } });
      processed++;
    }

    // Stage 2: teacher notified after the configured delay.
    if (overdueDays >= config.teacherNotifyAfterDays) {
      const teacherMarker = `hw:${submission.id}:teacher`;
      if (!(await automationService.hasFiredRecently(RULE_KEY, submission.studentId, teacherMarker))) {
        const teacherContacts = await recipients.getBatchTeacherContacts(submission.homework.batchId);
        await automationService.dispatchAlert({
          userIds: teacherContacts.map((c) => c.userId).filter((id): id is string => Boolean(id)),
          notificationType: "HOMEWORK_REMINDER",
          title: "Student homework overdue",
          message: `${submission.student.fullName} has not submitted "${submission.homework.title}" (${overdueDays} days overdue).`,
          relatedEntityType: "Homework",
          relatedEntityId: submission.homework.id,
        });
        await automationService.logAutomation({ ruleKey: RULE_KEY, studentId: submission.studentId, action: `${overdueDays}d overdue — notified teacher`, details: { marker: teacherMarker } });
        processed++;
      }
    }

    // Stage 3: parent notified after the configured delay.
    if (overdueDays >= config.parentNotifyAfterDays) {
      const parentMarker = `hw:${submission.id}:parent`;
      if (!(await automationService.hasFiredRecently(RULE_KEY, submission.studentId, parentMarker))) {
        const variables = { student_name: submission.student.fullName, subject: submission.homework.subject.name };
        await automationService.dispatchAlert({
          userIds: contacts.parents.map((p) => p.userId).filter((id): id is string => Boolean(id)),
          notificationType: "HOMEWORK_REMINDER",
          title: "Homework alert",
          message: `${submission.student.fullName} has not submitted "${submission.homework.title}" (${overdueDays} days overdue).`,
          relatedEntityType: "Homework",
          relatedEntityId: submission.homework.id,
          whatsapp: contacts.parents.map((p) => ({ phone: p.phone, userId: p.userId, templateKey: "HOMEWORK_REMINDER", variables })),
          email: contacts.parents.filter((p) => p.email).map((p) => ({ email: p.email!, userId: p.userId, templateKey: "HOMEWORK_REMINDER", variables })),
        });
        await automationService.logAutomation({ ruleKey: RULE_KEY, studentId: submission.studentId, action: `${overdueDays}d overdue — notified parent`, details: { marker: parentMarker } });
        processed++;
      }
    }
  }

  return { processed };
}
