import { PageHeader } from "@/components/shared/page-header";
import * as automationService from "@/lib/services/automation";
import { RuleCard, type RuleFieldDef } from "./rule-card";

const RULE_META: Record<string, { name: string; description: string; fields: RuleFieldDef[]; defaults: Record<string, number> }> = {
  ATTENDANCE_ABSENCE: {
    name: "Student Misses Class",
    description: "Notify teacher, parent, and admin after N consecutive absences.",
    fields: [{ name: "consecutiveAbsences", label: "Consecutive absences", type: "number" }],
    defaults: { consecutiveAbsences: 2 },
  },
  HOMEWORK_OVERDUE: {
    name: "Homework Overdue",
    description: "Student is reminded immediately; teacher and parent are notified after configurable delays.",
    fields: [
      { name: "teacherNotifyAfterDays", label: "Notify teacher after (days)", type: "number" },
      { name: "parentNotifyAfterDays", label: "Notify parent after (days)", type: "number" },
    ],
    defaults: { teacherNotifyAfterDays: 2, parentNotifyAfterDays: 5 },
  },
  LOW_TEST_SCORE: {
    name: "Low Test Performance",
    description: "Flag a below-threshold score for teacher review; notify parent if it repeats.",
    fields: [
      { name: "thresholdPercent", label: "Low score threshold (%)", type: "number" },
      { name: "repeatedCountForParentAlert", label: "Repeats before parent alert", type: "number" },
    ],
    defaults: { thresholdPercent: 40, repeatedCountForParentAlert: 2 },
  },
  PAYMENT_REMINDER: {
    name: "Payment Reminders",
    description: "Remind the parent before and on the due date; escalate to an admin follow-up if overdue.",
    fields: [
      { name: "beforeDueDays", label: "Remind before due (days)", type: "number" },
      { name: "overdueDaysForFollowup", label: "Admin follow-up after overdue (days)", type: "number" },
    ],
    defaults: { beforeDueDays: 5, overdueDaysForFollowup: 3 },
  },
  STUDENT_INACTIVITY: {
    name: "Student Inactivity",
    description: "Notify the student, parent, and admin engagement dashboard after no login for N days.",
    fields: [{ name: "inactiveDays", label: "Inactive after (days)", type: "number" }],
    defaults: { inactiveDays: 7 },
  },
  TRIAL_EXPIRY: {
    name: "Trial Expiry",
    description: "When a trial ends: create a counselor follow-up, move the lead to Payment Pending, and notify the counselor.",
    fields: [],
    defaults: {},
  },
  LEAD_FOLLOWUP: {
    name: "Lead Follow-up",
    description: "Auto-create an overdue follow-up when a lead has had no activity for N days.",
    fields: [{ name: "staleDays", label: "No activity for (days)", type: "number" }],
    defaults: { staleDays: 5 },
  },
  CLASS_REMINDER: {
    name: "Class Reminders",
    description: "Which reminders go out before a live class, and who besides the student gets them.",
    fields: [
      { name: "offset24hEnabled", label: "Send 24 hours before", type: "boolean" },
      { name: "offset1hEnabled", label: "Send 1 hour before", type: "boolean" },
      { name: "offset30mEnabled", label: "Send 30 minutes before", type: "boolean" },
      { name: "notifyParent", label: "Also notify parent", type: "boolean" },
      { name: "notifyTeacher", label: "Also notify teacher", type: "boolean" },
    ],
    defaults: { offset24hMinutes: 1440, offset1hMinutes: 60, offset30mMinutes: 30, offset24hEnabled: 0, offset1hEnabled: 1, offset30mEnabled: 1, notifyParent: 0, notifyTeacher: 0 },
  },
  WEEKLY_PARENT_REPORT: {
    name: "Weekly Parent Report",
    description: "Generates and sends every active student's weekly progress report automatically (reuses the same report Staff can generate manually from Student 360).",
    fields: [],
    defaults: {},
  },
};

export default async function AutomationSettingsPage() {
  const rules = await automationService.listRules();
  const byKey = new Map(rules.map((r) => [r.key, r]));

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Automation Rules" description="The system automatically detects problems (attendance, homework, tests, payments, inactivity, trials, lead follow-ups) and notifies the right people. Toggle rules on/off and tune their thresholds here." />
      <div className="space-y-4">
        {Object.entries(RULE_META).map(([key, meta]) => {
          const rule = byKey.get(key as never);
          return (
            <RuleCard
              key={key}
              ruleKey={key as never}
              name={meta.name}
              description={meta.description}
              isActive={rule?.isActive ?? true}
              config={{ ...meta.defaults, ...((rule?.config as Record<string, number>) ?? {}) }}
              fields={meta.fields}
            />
          );
        })}
      </div>
    </div>
  );
}
