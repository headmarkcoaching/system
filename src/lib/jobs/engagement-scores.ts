import "server-only";
import * as engagementService from "@/lib/services/engagement";
import * as automationService from "@/lib/services/automation";

/** Daily recalculation of every active/trial student's Engagement Score — same
 * iterate-all-students shape as weekly-reports.ts. Not gated by an AutomationRule since
 * it's a pure recalculation (no notification side-effect), same as Phase 2's Performance
 * recalculation precedent. */
export async function runEngagementScoreRecalculation() {
  const results = await engagementService.recalculateAllEngagementScores();

  await automationService.logAutomation({
    ruleKey: "ENGAGEMENT_RECALC",
    action: `Recalculated engagement scores for ${results.length} students`,
    details: { count: results.length },
  });

  return { processed: results.length };
}
