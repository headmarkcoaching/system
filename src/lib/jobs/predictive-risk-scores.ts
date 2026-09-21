import "server-only";
import * as riskService from "@/lib/services/predictive-risk";
import * as automationService from "@/lib/services/automation";

/** Daily recalculation of every active/trial student's predictive risk score — same
 * iterate-all-students shape as engagement-scores.ts. Not gated by an AutomationRule since
 * it's a pure recalculation (no notification side-effect), same precedent as Engagement. */
export async function runPredictiveRiskScoreRecalculation() {
  const results = await riskService.recalculateAllRiskScores();

  await automationService.logAutomation({
    ruleKey: "PREDICTIVE_RISK_RECALC",
    action: `Recalculated predictive risk scores for ${results.length} students`,
    details: { count: results.length },
  });

  return { processed: results.length };
}
