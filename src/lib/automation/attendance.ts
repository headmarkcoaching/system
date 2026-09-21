import "server-only";
import { db } from "@/lib/db";
import * as automationService from "@/lib/services/automation";
import * as recipients from "@/lib/services/automation-recipients";

const RULE_KEY = "ATTENDANCE_ABSENCE" as const;
const DEFAULTS = { consecutiveAbsences: 2 };

/**
 * Called right after attendance is marked for a live class (batches.ts markAttendance).
 * If this student's most recent N attendance records are all ABSENT, fires the
 * "engagement warning" alert to teacher + parent, and logs it for the admin to see.
 * Guarded so the same streak never re-notifies on every subsequent class.
 */
export async function checkConsecutiveAbsences(studentId: string, batchId: string) {
  const { isActive, config } = await automationService.getRuleConfig(RULE_KEY, DEFAULTS);
  if (!isActive) return;

  const recent = await db.attendance.findMany({
    where: { studentId },
    orderBy: { date: "desc" },
    take: config.consecutiveAbsences,
  });

  if (recent.length < config.consecutiveAbsences) return;
  if (!recent.every((a) => a.status === "ABSENT")) return;

  const marker = `streak:${recent[0].id}`;
  if (await automationService.hasFiredRecently(RULE_KEY, studentId, marker)) return;

  const student = await db.student.findUniqueOrThrow({ where: { id: studentId } });
  const [contacts, teacherContacts, staffUserIds] = await Promise.all([
    recipients.getStudentContacts(studentId),
    recipients.getBatchTeacherContacts(batchId),
    recipients.getStaffUserIds(),
  ]);

  const title = "Attendance alert";
  const message = `${student.fullName} has missed ${config.consecutiveAbsences} consecutive classes.`;

  const notifyUserIds = [...teacherContacts.map((c) => c.userId).filter((id): id is string => Boolean(id)), ...contacts.parents.map((p) => p.userId).filter((id): id is string => Boolean(id)), ...staffUserIds];

  const variables = { student_name: student.fullName };
  await automationService.dispatchAlert({
    userIds: Array.from(new Set(notifyUserIds)),
    notificationType: "ATTENDANCE_ALERT",
    title,
    message,
    relatedEntityType: "Student",
    relatedEntityId: studentId,
    whatsapp: contacts.parents.map((p) => ({ phone: p.phone, userId: p.userId, templateKey: "ATTENDANCE_ALERT", variables })),
    email: contacts.parents.filter((p) => p.email).map((p) => ({ email: p.email!, userId: p.userId, templateKey: "ATTENDANCE_ALERT", variables })),
  });

  await automationService.logAutomation({
    ruleKey: RULE_KEY,
    studentId,
    action: `${config.consecutiveAbsences} consecutive absences — notified teacher, parent, and admin`,
    details: { marker, consecutiveAbsences: config.consecutiveAbsences },
  });
}
