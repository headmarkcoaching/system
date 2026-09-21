import "server-only";
import { runHomeworkOverdueCheck } from "@/lib/jobs/homework-overdue";
import { runPaymentReminders } from "@/lib/jobs/payment-reminders";
import { runInactivityCheck } from "@/lib/jobs/inactivity";
import { runTrialExpiryCheck } from "@/lib/jobs/trial-expiry";
import { runLeadFollowupCheck } from "@/lib/jobs/lead-followup";
import { runClassReminders } from "@/lib/jobs/class-reminders";
import { runWeeklyParentReports } from "@/lib/jobs/weekly-reports";
import { runEngagementScoreRecalculation } from "@/lib/jobs/engagement-scores";
import { runPredictiveRiskScoreRecalculation } from "@/lib/jobs/predictive-risk-scores";
import { runAttendanceAutoDetect } from "@/lib/jobs/attendance-auto-detect";
import { db } from "@/lib/db";

/**
 * Registry of every scheduled job, keyed by the slug used in both /api/cron/[job]
 * (production, called by an external scheduler) and scripts/run-jobs.ts (local dev,
 * called directly or by node-cron via `npm run jobs:watch`). Consecutive-absence and
 * low-test-score automation are event-driven (see src/lib/automation/*) and aren't
 * scheduled jobs; attendance-auto-detect IS scheduled because it must run repeatedly to
 * catch classes as their end time passes, not in response to a single event.
 */
export const JOB_REGISTRY = {
  "homework-overdue": runHomeworkOverdueCheck,
  "payment-reminders": runPaymentReminders,
  inactivity: runInactivityCheck,
  "trial-expiry": runTrialExpiryCheck,
  "lead-followup": runLeadFollowupCheck,
  "class-reminders": runClassReminders,
  "weekly-reports": runWeeklyParentReports,
  "engagement-scores": runEngagementScoreRecalculation,
  "predictive-risk-scores": runPredictiveRiskScoreRecalculation,
  "attendance-auto-detect": runAttendanceAutoDetect,
} as const;

export type JobKey = keyof typeof JOB_REGISTRY;

/** Every run's outcome is persisted to JobRun — the Phase 3E Observability gap found during
 * inspect-first: /api/cron/[job] already caught and returned a job's error in its HTTP
 * response, but nothing recorded that anywhere queryable, so a failure called by an external
 * scheduler with nobody watching the response body was effectively invisible. Logging failure
 * itself is non-fatal (try/catch), matching the logAudit/logAIInteraction precedent — a
 * broken log write must never mask whether the job itself actually succeeded. */
export async function runJob(key: JobKey) {
  const startedAt = new Date();
  try {
    const result = await JOB_REGISTRY[key]();
    await db.jobRun
      .create({ data: { jobKey: key, status: "SUCCESS", itemsProcessed: result.processed, startedAt, finishedAt: new Date() } })
      .catch((err) => console.error("Failed to log job run", err));
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await db.jobRun
      .create({ data: { jobKey: key, status: "FAILED", errorMessage, startedAt, finishedAt: new Date() } })
      .catch((err) => console.error("Failed to log job run", err));
    throw error;
  }
}

export async function runAllJobs() {
  const results: Record<string, { processed: number } | { error: string }> = {};
  for (const key of Object.keys(JOB_REGISTRY) as JobKey[]) {
    try {
      results[key] = await runJob(key);
    } catch (error) {
      results[key] = { error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
  return results;
}
