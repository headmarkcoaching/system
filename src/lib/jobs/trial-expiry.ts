import "server-only";
import { db } from "@/lib/db";
import * as automationService from "@/lib/services/automation";
import * as recipients from "@/lib/services/automation-recipients";
import * as leadService from "@/lib/services/leads";

const RULE_KEY = "TRIAL_EXPIRY" as const;
const DEFAULTS = {};

/** Rule 6: trial ends -> counselor follow-up, lead moves to Payment Pending, counselor notified. */
export async function runTrialExpiryCheck(now = new Date()) {
  const { isActive } = await automationService.getRuleConfig(RULE_KEY, DEFAULTS);
  if (!isActive) {
    await automationService.logAutomation({ ruleKey: RULE_KEY, action: "Rule disabled — skipped", status: "SKIPPED" });
    return { processed: 0 };
  }

  const expiredTrials = await db.trial.findMany({
    where: { endDate: { lt: now }, enrollmentStatus: "IN_PROGRESS" },
    include: { lead: true },
  });

  let processed = 0;

  for (const trial of expiredTrials) {
    const marker = `trial:${trial.id}:expired`;
    if (await automationService.hasFiredRecently(RULE_KEY, trial.leadId, marker, "leadId")) continue;

    await leadService.updateTrial(trial.id, { enrollmentStatus: "COMPLETED" });
    if (trial.lead.stage === "FREE_TRIAL") {
      await leadService.changeLeadStage(trial.leadId, "PAYMENT_PENDING");
    }
    await leadService.addLeadFollowup(trial.leadId, now.toISOString(), "Auto: trial period ended — follow up on enrollment decision.");

    const counselorContact = await recipients.getCounselorContact(trial.lead.assignedCounselorId);
    const variables = { student_name: trial.lead.studentName };
    await automationService.dispatchAlert({
      userIds: counselorContact?.userId ? [counselorContact.userId] : [],
      notificationType: "FOLLOWUP_ALERT",
      title: "Trial ended",
      message: `${trial.lead.studentName}'s trial has ended — follow up on their enrollment decision.`,
      relatedEntityType: "Lead",
      relatedEntityId: trial.leadId,
      whatsapp: counselorContact?.phone ? [{ phone: counselorContact.phone, userId: counselorContact.userId, templateKey: "TRIAL_REMINDER", variables }] : [],
      email: counselorContact?.email ? [{ email: counselorContact.email, userId: counselorContact.userId, templateKey: "TRIAL_REMINDER", variables }] : [],
    });

    await automationService.logAutomation({
      ruleKey: RULE_KEY,
      leadId: trial.leadId,
      action: `Trial ended for ${trial.lead.studentName} — created counselor follow-up, moved lead to Payment Pending`,
      details: { marker },
    });
    processed++;
  }

  return { processed };
}
