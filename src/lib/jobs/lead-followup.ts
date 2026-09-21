import "server-only";
import { db } from "@/lib/db";
import * as automationService from "@/lib/services/automation";
import * as recipients from "@/lib/services/automation-recipients";
import * as leadService from "@/lib/services/leads";

const RULE_KEY = "LEAD_FOLLOWUP" as const;
const DEFAULTS = { staleDays: 5 };
const OPEN_STAGES = ["NEW", "CONTACTED", "ASSESSMENT_BOOKED", "ASSESSMENT_COMPLETED", "FREE_TRIAL", "COUNSELLING", "PAYMENT_PENDING"] as const;

/** Rule 7: lead has no activity for N days -> auto-create an overdue follow-up, notify counselor. */
export async function runLeadFollowupCheck(now = new Date()) {
  const { isActive, config } = await automationService.getRuleConfig(RULE_KEY, DEFAULTS);
  if (!isActive) {
    await automationService.logAutomation({ ruleKey: RULE_KEY, action: "Rule disabled — skipped", status: "SKIPPED" });
    return { processed: 0 };
  }

  const leads = await db.lead.findMany({
    where: { stage: { in: [...OPEN_STAGES] } },
    include: { activities: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  let processed = 0;

  for (const lead of leads) {
    const lastActivityAt = lead.activities[0]?.createdAt ?? lead.createdAt;
    const daysStale = Math.floor((now.getTime() - lastActivityAt.getTime()) / 86_400_000);
    if (daysStale < config.staleDays) continue;

    const marker = `lead:${lead.id}:stale:${lastActivityAt.toISOString()}`;
    if (await automationService.hasFiredRecently(RULE_KEY, lead.id, marker, "leadId")) continue;

    await leadService.addLeadFollowup(lead.id, now.toISOString(), `Auto: no activity for ${daysStale} days — overdue follow-up.`);

    const counselorContact = await recipients.getCounselorContact(lead.assignedCounselorId);
    const staffUserIds = await recipients.getStaffUserIds();
    await automationService.dispatchAlert({
      userIds: [...(counselorContact?.userId ? [counselorContact.userId] : []), ...(lead.assignedCounselorId ? [] : staffUserIds)],
      notificationType: "FOLLOWUP_ALERT",
      title: "Overdue lead follow-up",
      message: `${lead.studentName} has had no activity for ${daysStale} days.`,
      relatedEntityType: "Lead",
      relatedEntityId: lead.id,
    });

    await automationService.logAutomation({
      ruleKey: RULE_KEY,
      leadId: lead.id,
      action: `No activity for ${daysStale} days — auto-created overdue follow-up`,
      details: { marker },
    });
    processed++;
  }

  return { processed };
}
