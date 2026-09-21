import "server-only";
import { db } from "@/lib/db";
import * as automationService from "@/lib/services/automation";
import * as recipients from "@/lib/services/automation-recipients";
import { formatTime } from "@/lib/utils";

const RULE_KEY = "CLASS_REMINDER" as const;
const DEFAULTS = { offset24hMinutes: 1440, offset1hMinutes: 60, offset30mMinutes: 30, offset24hEnabled: 0, offset1hEnabled: 1, offset30mEnabled: 1, notifyParent: 0, notifyTeacher: 0 };
// Generous window so a job that polls every few minutes still catches each offset exactly once (guarded by marker).
const WINDOW_MINUTES = 15;

function combineDateAndTime(date: Date, hhmm: string) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

/** Rule 8 (Class Reminders): fires reminders at each enabled offset before a live class. */
export async function runClassReminders(now = new Date()) {
  const { isActive, config } = await automationService.getRuleConfig(RULE_KEY, DEFAULTS);
  if (!isActive) {
    await automationService.logAutomation({ ruleKey: RULE_KEY, action: "Rule disabled — skipped", status: "SKIPPED" });
    return { processed: 0 };
  }

  const offsets: { minutes: number; label: string }[] = [];
  if (config.offset24hEnabled) offsets.push({ minutes: config.offset24hMinutes, label: "24h" });
  if (config.offset1hEnabled) offsets.push({ minutes: config.offset1hMinutes, label: "1h" });
  if (config.offset30mEnabled) offsets.push({ minutes: config.offset30mMinutes, label: "30m" });
  if (offsets.length === 0) return { processed: 0 };

  const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60_000);
  const windowEnd = new Date(now.getTime() + Math.max(...offsets.map((o) => o.minutes)) * 60_000);

  const upcomingClasses = await db.liveClass.findMany({
    where: { status: "UPCOMING", scheduledDate: { gte: new Date(now.getTime() - 86_400_000), lte: windowEnd } },
    include: { subject: true, batch: true },
  });

  let processed = 0;

  for (const liveClass of upcomingClasses) {
    const classDateTime = combineDateAndTime(liveClass.scheduledDate, liveClass.startTime);

    for (const offset of offsets) {
      const target = new Date(classDateTime.getTime() - offset.minutes * 60_000);
      if (target < windowStart || target > now) continue;

      const marker = `class:${liveClass.id}:offset:${offset.label}`;
      if (await automationService.hasFiredRecently(RULE_KEY, null, marker)) continue;

      const roster = await db.batchStudent.findMany({ where: { batchId: liveClass.batchId }, include: { student: true } });
      const teacherContacts = config.notifyTeacher ? await recipients.getBatchTeacherContacts(liveClass.batchId) : [];

      const studentUserIds = roster.map((r) => r.student.userId).filter((id): id is string => Boolean(id));
      let parentUserIds: string[] = [];
      const whatsappTargets: { phone: string; userId?: string; email?: string }[] = [];

      for (const r of roster) {
        const contacts = await recipients.getStudentContacts(r.studentId);
        if (contacts.student) whatsappTargets.push(contacts.student);
        if (config.notifyParent) {
          parentUserIds.push(...contacts.parents.map((p) => p.userId).filter((id): id is string => Boolean(id)));
          whatsappTargets.push(...contacts.parents);
        }
      }

      const variables = { class_name: liveClass.title, subject: liveClass.subject.name, batch_name: liveClass.batch.name, time: formatTime(liveClass.startTime) };
      await automationService.dispatchAlert({
        userIds: Array.from(new Set([...studentUserIds, ...parentUserIds, ...teacherContacts.map((c) => c.userId).filter((id): id is string => Boolean(id))])),
        notificationType: "CLASS_REMINDER",
        title: "Upcoming class",
        message: `${liveClass.title} (${liveClass.subject.name}) starts at ${formatTime(liveClass.startTime)}.`,
        relatedEntityType: "LiveClass",
        relatedEntityId: liveClass.id,
        whatsapp: whatsappTargets.map((t) => ({ phone: t.phone, userId: t.userId, templateKey: "CLASS_REMINDER", variables })),
        email: whatsappTargets.filter((t) => t.email).map((t) => ({ email: t.email!, userId: t.userId, templateKey: "CLASS_REMINDER", variables })),
      });

      await automationService.logAutomation({
        ruleKey: RULE_KEY,
        action: `${offset.label} reminder sent for "${liveClass.title}" (${liveClass.batch.name})`,
        details: { marker },
      });
      processed++;
    }
  }

  return { processed };
}
