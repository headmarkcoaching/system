import "server-only";
import { db } from "@/lib/db";
import type { PerformanceCategory } from "@prisma/client";
import * as participationService from "@/lib/services/participation";

const CONFIG_ID = "singleton";

export async function getPerformanceConfig() {
  return db.performanceConfig.upsert({
    where: { id: CONFIG_ID },
    update: {},
    create: { id: CONFIG_ID },
  });
}

export interface PerformanceConfigInput {
  attendanceWeight: number;
  homeworkWeight: number;
  testWeight: number;
  participationWeight: number;
  excellentThreshold: number;
  progressingThreshold: number;
  needsAttentionThreshold: number;
  atRiskAttendanceBelow: number;
  atRiskHomeworkBelow: number;
  atRiskTestBelow: number;
}

export async function updatePerformanceConfig(data: PerformanceConfigInput, updatedById: string) {
  return db.performanceConfig.upsert({
    where: { id: CONFIG_ID },
    update: { ...data, updatedById },
    create: { id: CONFIG_ID, ...data, updatedById },
  });
}

function resolveCategory(
  overallScore: number,
  metrics: { attendance: number; homework: number; test: number | null },
  config: Awaited<ReturnType<typeof getPerformanceConfig>>
): { category: PerformanceCategory; reasons: string[] } {
  const reasons: string[] = [];
  if (metrics.attendance < config.atRiskAttendanceBelow) reasons.push(`Attendance ${Math.round(metrics.attendance)}%`);
  if (metrics.homework < config.atRiskHomeworkBelow) reasons.push(`Homework completion ${Math.round(metrics.homework)}%`);
  if (metrics.test !== null && metrics.test < config.atRiskTestBelow) reasons.push(`Test average ${Math.round(metrics.test)}%`);

  if (reasons.length > 0) return { category: "AT_RISK", reasons };

  if (overallScore >= config.excellentThreshold) return { category: "EXCELLENT", reasons: [] };
  if (overallScore >= config.progressingThreshold) return { category: "PROGRESSING", reasons: [] };
  if (overallScore >= config.needsAttentionThreshold) return { category: "NEEDS_ATTENTION", reasons: [] };
  return { category: "AT_RISK", reasons: ["Overall performance score below threshold"] };
}

export function suggestedActionFor(reason: string): string {
  if (reason.startsWith("Attendance")) return "Contact Parent";
  if (reason.startsWith("Homework")) return "Send Reminder";
  if (reason.startsWith("Test")) return "Teacher Review";
  return "Review Profile";
}

export async function calculateStudentPerformance(studentId: string, batchId: string | null, periodStart: Date, periodEnd: Date) {
  const [attendanceRecords, homeworkRecords, testResults, participationScore, config] = await Promise.all([
    db.attendance.findMany({ where: { studentId, date: { gte: periodStart, lte: periodEnd } } }),
    db.homeworkSubmission.findMany({
      where: { studentId, homework: { dueDate: { gte: periodStart, lte: periodEnd } } },
    }),
    db.testResult.findMany({
      where: { studentId, gradedAt: { not: null, gte: periodStart, lte: periodEnd } },
    }),
    participationService.getLatestParticipationScore(studentId),
    getPerformanceConfig(),
  ]);

  const attendanceScore =
    attendanceRecords.length === 0
      ? 100
      : (attendanceRecords.filter((a) => a.status === "PRESENT" || a.status === "LATE").length / attendanceRecords.length) * 100;

  const homeworkScore =
    homeworkRecords.length === 0
      ? 100
      : (homeworkRecords.filter((h) => h.status === "SUBMITTED" || h.status === "REVIEWED").length / homeworkRecords.length) * 100;

  const hasTests = testResults.length > 0;
  const testScore = hasTests
    ? testResults.reduce((sum, r) => sum + (r.totalMarks === 0 ? 0 : (r.marksObtained / r.totalMarks) * 100), 0) / testResults.length
    : null;

  const hasParticipation = participationScore !== null;
  const participation = participationScore;

  const parts: { value: number; weight: number }[] = [
    { value: attendanceScore, weight: config.attendanceWeight },
    { value: homeworkScore, weight: config.homeworkWeight },
  ];
  if (hasTests) parts.push({ value: testScore as number, weight: config.testWeight });
  if (hasParticipation) parts.push({ value: participation as number, weight: config.participationWeight });

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0) || 1;
  const overallScore = Math.round(parts.reduce((s, p) => s + p.value * p.weight, 0) / totalWeight);

  const { category, reasons } = resolveCategory(overallScore, { attendance: attendanceScore, homework: homeworkScore, test: testScore }, config);

  const record = await db.studentPerformance.create({
    data: {
      studentId,
      batchId: batchId ?? undefined,
      periodStart,
      periodEnd,
      attendanceScore,
      homeworkScore,
      testScore: testScore ?? 0,
      participationScore: participation ?? 0,
      overallScore,
      category,
    },
  });

  return { record, reasons, hasTests, hasParticipation };
}

export async function recalculateForBatch(batchId: string, periodStart: Date, periodEnd: Date) {
  const roster = await db.batchStudent.findMany({ where: { batchId }, select: { studentId: true } });
  const results = [];
  for (const r of roster) {
    results.push(await calculateStudentPerformance(r.studentId, batchId, periodStart, periodEnd));
  }
  return results;
}

export function getPerformanceHistory(studentId: string) {
  return db.studentPerformance.findMany({
    where: { studentId },
    orderBy: { calculatedAt: "desc" },
    take: 12,
  });
}

export async function getLatestPerformance(studentId: string) {
  return db.studentPerformance.findFirst({ where: { studentId }, orderBy: { calculatedAt: "desc" } });
}

export async function listAtRiskStudents() {
  const [allLatest, config] = await Promise.all([
    db.studentPerformance.findMany({
      orderBy: { calculatedAt: "desc" },
      include: { student: { include: { academicLevel: true, batchMemberships: { include: { batch: true } } } }, batch: true },
    }),
    getPerformanceConfig(),
  ]);

  const seen = new Set<string>();
  const latestPerStudent = allLatest.filter((record) => {
    if (seen.has(record.studentId)) return false;
    seen.add(record.studentId);
    return true;
  });

  return latestPerStudent
    .filter((record) => record.category === "AT_RISK")
    .map((record) => {
      const reasons: string[] = [];
      if (record.attendanceScore < config.atRiskAttendanceBelow) reasons.push(`Attendance ${Math.round(record.attendanceScore)}%`);
      if (record.homeworkScore < config.atRiskHomeworkBelow) reasons.push(`Homework completion ${Math.round(record.homeworkScore)}%`);
      if (record.testScore > 0 && record.testScore < config.atRiskTestBelow) reasons.push(`Test average ${Math.round(record.testScore)}%`);
      const primaryReason = reasons[0] ?? "Overall performance score below threshold";
      return {
        student: record.student,
        batch: record.batch ?? record.student.batchMemberships[0]?.batch ?? null,
        overallScore: record.overallScore,
        reasons: reasons.length > 0 ? reasons : [primaryReason],
        suggestedAction: suggestedActionFor(primaryReason),
        calculatedAt: record.calculatedAt,
      };
    });
}
