import "server-only";
import { db } from "@/lib/db";
import * as automationService from "@/lib/services/automation";
import * as recipients from "@/lib/services/automation-recipients";
import { formatPKR, formatDate } from "@/lib/utils";

const RULE_KEY = "PAYMENT_REMINDER" as const;
const DEFAULTS = { beforeDueDays: 5, overdueDaysForFollowup: 3 };

function daysUntil(date: Date, now: Date) {
  return Math.round((date.getTime() - now.getTime()) / 86_400_000);
}

/** Rule 4: N days before due -> reminder. On due date -> reminder. N days overdue -> admin follow-up. */
export async function runPaymentReminders(now = new Date()) {
  const { isActive, config } = await automationService.getRuleConfig(RULE_KEY, DEFAULTS);
  if (!isActive) {
    await automationService.logAutomation({ ruleKey: RULE_KEY, action: "Rule disabled — skipped", status: "SKIPPED" });
    return { processed: 0 };
  }

  const installments = await db.installment.findMany({
    where: { status: { in: ["PENDING", "PARTIALLY_PAID"] } },
    include: { paymentPlan: { include: { student: true } } },
  });

  let processed = 0;
  const staffUserIds = await recipients.getStaffUserIds();

  for (const installment of installments) {
    const student = installment.paymentPlan.student;
    const diff = daysUntil(installment.dueDate, now);
    const contacts = await recipients.getStudentContacts(student.id);
    const amount = formatPKR(installment.amount.toString());

    let stage: "upcoming" | "due" | "overdue" | null = null;
    if (diff === config.beforeDueDays) stage = "upcoming";
    else if (diff === 0) stage = "due";
    else if (diff <= -config.overdueDaysForFollowup) stage = "overdue";
    if (!stage) continue;

    const marker = `installment:${installment.id}:${stage}`;
    if (await automationService.hasFiredRecently(RULE_KEY, student.id, marker)) continue;

    if (stage === "overdue") {
      await automationService.dispatchAlert({
        userIds: staffUserIds,
        notificationType: "PAYMENT_REMINDER",
        title: "Payment follow-up needed",
        message: `${student.fullName}'s installment of ${amount} (due ${formatDate(installment.dueDate)}) is ${-diff} days overdue.`,
        relatedEntityType: "Installment",
        relatedEntityId: installment.id,
      });
      await automationService.logAutomation({ ruleKey: RULE_KEY, studentId: student.id, action: `Installment ${-diff}d overdue — created admin follow-up`, details: { marker } });
    } else {
      const title = stage === "due" ? "Payment due today" : "Upcoming payment reminder";
      const message = stage === "due" ? `${student.fullName}'s installment of ${amount} is due today.` : `${student.fullName}'s installment of ${amount} is due on ${formatDate(installment.dueDate)}.`;
      const variables = { student_name: student.fullName, payment_amount: amount, date: formatDate(installment.dueDate) };
      await automationService.dispatchAlert({
        userIds: contacts.parents.map((p) => p.userId).filter((id): id is string => Boolean(id)),
        notificationType: "PAYMENT_REMINDER",
        title,
        message,
        relatedEntityType: "Installment",
        relatedEntityId: installment.id,
        whatsapp: contacts.parents.map((p) => ({ phone: p.phone, userId: p.userId, templateKey: "PAYMENT_REMINDER", variables })),
        email: contacts.parents.filter((p) => p.email).map((p) => ({ email: p.email!, userId: p.userId, templateKey: "PAYMENT_REMINDER", variables })),
      });
      await automationService.logAutomation({ ruleKey: RULE_KEY, studentId: student.id, action: `${title} — notified parent`, details: { marker } });
    }

    processed++;
  }

  return { processed };
}
