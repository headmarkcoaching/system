import "server-only";
import { db } from "@/lib/db";
import type { RiskLevel } from "@prisma/client";
import * as performanceService from "@/lib/services/performance";
import * as engagementService from "@/lib/services/engagement";

const THRESHOLDS = { moderate: 30, high: 55, critical: 75 } as const;

function resolveRiskLevel(score: number): RiskLevel {
  if (score >= THRESHOLDS.critical) return "CRITICAL";
  if (score >= THRESHOLDS.high) return "HIGH";
  if (score >= THRESHOLDS.moderate) return "MODERATE";
  return "LOW";
}

/** Slope of a metric across the last few StudentPerformance snapshots (oldest to newest,
 * since getPerformanceHistory returns newest-first). A positive slope means the metric is
 * declining over time — this is the "predictive" part: unlike the existing AT_RISK category
 * (a single-snapshot threshold breach), a worsening trend surfaces before any one snapshot
 * would trip a threshold on its own. */
function decliningTrendComponent(valuesNewestFirst: number[]): number {
  if (valuesNewestFirst.length < 2) return 0;
  const oldest = valuesNewestFirst[valuesNewestFirst.length - 1];
  const newest = valuesNewestFirst[0];
  const drop = oldest - newest;
  if (drop <= 0) return 0;
  return Math.min(100, drop * 2);
}

function inactivityComponent(lastLoginAt: Date | null): number {
  if (!lastLoginAt) return 100;
  const daysSince = (Date.now() - lastLoginAt.getTime()) / 86_400_000;
  if (daysSince <= 3) return 0;
  if (daysSince <= 7) return 30;
  if (daysSince <= 14) return 60;
  return 100;
}

export interface RiskSignal {
  label: string;
  weight: number;
}

/** Transparent, rule-based risk score (0-100, higher = more concerning) built from trend
 * signals rather than a single snapshot — deliberately not an AI-generated score (same
 * "not everything should be AI" reasoning as next-actions.ts's Smart Next Action Engine):
 * every input and weight here is inspectable, unlike a model's internal reasoning. An
 * AI-drafted narrative/action-plan can be layered on top via teacher-assistant.ts's
 * suggestInterventionPlan(), which explains *why* using these exact signals. */
export async function calculatePredictiveRiskScore(studentId: string) {
  const [history, engagement] = await Promise.all([performanceService.getPerformanceHistory(studentId), engagementService.getLatestEngagementScore(studentId)]);

  const attendanceTrendComponent = decliningTrendComponent(history.map((h) => h.attendanceScore));
  const homeworkTrendComponent = decliningTrendComponent(history.map((h) => h.homeworkScore));
  const testTrendComponent = decliningTrendComponent(history.map((h) => h.testScore));
  const engagementComponent = engagement ? Math.max(0, 100 - engagement.score) : 50;
  const student = await db.student.findUniqueOrThrow({ where: { id: studentId }, include: { user: true } });
  const inactivity = inactivityComponent(student.user?.lastLoginAt ?? null);

  const score = Math.round(
    attendanceTrendComponent * 0.25 + homeworkTrendComponent * 0.2 + testTrendComponent * 0.25 + engagementComponent * 0.2 + inactivity * 0.1
  );
  const riskLevel = resolveRiskLevel(score);

  const signals: string[] = [];
  if (attendanceTrendComponent > 0) signals.push("Attendance has been declining across recent performance snapshots.");
  if (homeworkTrendComponent > 0) signals.push("Homework completion has been declining across recent performance snapshots.");
  if (testTrendComponent > 0) signals.push("Test scores have been declining across recent performance snapshots.");
  if (engagement && engagement.score < 60) signals.push(`Engagement score is low (${Math.round(engagement.score)}/100, ${engagement.status}).`);
  if (inactivity >= 60) signals.push("No recent login activity.");
  if (signals.length === 0) signals.push("No concerning trends detected — this is a stable, transparent baseline reading.");

  return db.predictiveRiskScore.create({
    data: {
      studentId,
      score,
      riskLevel,
      attendanceTrendComponent,
      homeworkTrendComponent,
      testTrendComponent,
      engagementComponent,
      inactivityComponent: inactivity,
      signals,
    },
  });
}

export async function recalculateAllRiskScores() {
  const students = await db.student.findMany({ where: { status: { in: ["ACTIVE", "TRIAL"] } }, select: { id: true } });
  const results = [];
  for (const s of students) {
    results.push(await calculatePredictiveRiskScore(s.id));
  }
  return results;
}

export function getLatestRiskScore(studentId: string) {
  return db.predictiveRiskScore.findFirst({ where: { studentId }, orderBy: { calculatedAt: "desc" } });
}

export async function listByRiskLevel(riskLevel?: RiskLevel) {
  const all = await db.predictiveRiskScore.findMany({
    orderBy: { calculatedAt: "desc" },
    include: { student: { include: { academicLevel: true, batchMemberships: { include: { batch: true } } } } },
  });
  const seen = new Set<string>();
  const latestPerStudent = all.filter((r) => {
    if (seen.has(r.studentId)) return false;
    seen.add(r.studentId);
    return true;
  });
  return riskLevel ? latestPerStudent.filter((r) => r.riskLevel === riskLevel) : latestPerStudent;
}
