import "server-only";
import { db } from "@/lib/db";
import type { LeadStage, QuestionType } from "@prisma/client";
import * as paymentsService from "@/lib/services/payments";
import * as performanceService from "@/lib/services/performance";

export { logAnalyticsEvent, type LogAnalyticsEventInput } from "@/lib/services/analytics-events";

const FUNNEL_STAGES: LeadStage[] = ["NEW", "CONTACTED", "ASSESSMENT_BOOKED", "ASSESSMENT_COMPLETED", "FREE_TRIAL", "COUNSELLING", "PAYMENT_PENDING", "ENROLLED"];

function pct(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

// ---- Business Metrics ----

export async function businessMetrics() {
  const now = new Date();
  const [totalLeads, enrolledLeads, totalTrials, totalEnrollments, paymentPlanTotal, paymentsSummaryResult, retention] = await Promise.all([
    db.lead.count(),
    db.lead.count({ where: { stage: "ENROLLED" } }),
    db.trial.count(),
    db.student.count(),
    db.paymentPlan.aggregate({ _sum: { totalFee: true } }),
    paymentsService.paymentsSummary(),
    retentionAnalytics(now),
  ]);

  const monthlyRevenue = await revenueTrend(7);

  return {
    totalLeads,
    totalTrials,
    totalEnrollments,
    conversionRate: pct(enrolledLeads, totalLeads),
    monthlyRevenue,
    outstandingPayments: paymentsSummaryResult.pendingAmount + paymentsSummaryResult.overdueAmount,
    expectedRevenue: Number(paymentPlanTotal._sum.totalFee ?? 0),
    collectedThisMonth: paymentsSummaryResult.collectedThisMonth,
    retentionRate: retention.retentionRate,
  };
}

async function revenueTrend(monthsBack: number) {
  const now = new Date();
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    months.push({ label: start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), start, end });
  }

  const earliest = months[0].start;
  const payments = await db.payment.findMany({ where: { status: "PAID", paidAt: { gte: earliest } }, select: { amount: true, paidAt: true } });

  return months.map(({ label, start, end }) => ({
    month: label,
    amount: payments.filter((p) => p.paidAt && p.paidAt >= start && p.paidAt < end).reduce((sum, p) => sum + Number(p.amount), 0),
  }));
}

// ---- Lead Funnel ----

export async function leadFunnel(counselorId?: string) {
  const leads = await db.lead.findMany({ where: counselorId ? { assignedCounselorId: counselorId } : {}, select: { stage: true } });
  const lost = leads.filter((l) => l.stage === "LOST").length;
  const active = leads.filter((l) => l.stage !== "LOST");

  const stages = FUNNEL_STAGES.map((stage, idx) => {
    const reachedCount = active.filter((l) => FUNNEL_STAGES.indexOf(l.stage) >= idx).length;
    const currentCount = active.filter((l) => l.stage === stage).length;
    return { stage, currentCount, reachedCount };
  });

  const totalReached = stages[0]?.reachedCount ?? 0;
  return {
    stages: stages.map((s) => ({ ...s, conversionPercent: pct(s.reachedCount, totalReached) })),
    lost,
    totalActive: active.length,
  };
}

// ---- Marketing Analytics ----

export async function marketingAnalytics() {
  const leads = await db.lead.findMany({ select: { source: true, campaign: true, stage: true } });

  function summarize<K extends string>(getKey: (l: (typeof leads)[number]) => K | null) {
    const groups = new Map<K, { count: number; enrolled: number }>();
    for (const lead of leads) {
      const key = getKey(lead);
      if (key === null) continue;
      const g = groups.get(key) ?? { count: 0, enrolled: 0 };
      g.count++;
      if (lead.stage === "ENROLLED") g.enrolled++;
      groups.set(key, g);
    }
    return Array.from(groups.entries())
      .map(([key, g]) => ({ key, count: g.count, enrolled: g.enrolled, conversionPercent: pct(g.enrolled, g.count) }))
      .sort((a, b) => b.count - a.count);
  }

  const bySource = summarize((l) => l.source);
  const byCampaign = summarize((l) => l.campaign);
  const bestCampaign = byCampaign.filter((c) => c.count >= 3).sort((a, b) => b.conversionPercent - a.conversionPercent)[0] ?? null;

  return { bySource, byCampaign, bestCampaign };
}

// ---- Retention Analytics ----

export async function retentionAnalytics(month: Date = new Date()) {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  const students = await db.student.findMany({ select: { status: true, statusChangedAt: true, createdAt: true } });

  const left = (s: (typeof students)[number]) => s.status === "INACTIVE" || s.status === "ALUMNI";
  const leftBefore = (s: (typeof students)[number], cutoff: Date) => left(s) && !!s.statusChangedAt && s.statusChangedAt < cutoff;
  const leftDuring = (s: (typeof students)[number]) => left(s) && !!s.statusChangedAt && s.statusChangedAt >= monthStart && s.statusChangedAt < monthEnd;

  const activeAtStart = students.filter((s) => s.createdAt < monthStart && !leftBefore(s, monthStart));
  const newEnrollments = students.filter((s) => s.createdAt >= monthStart && s.createdAt < monthEnd).length;
  const leftInMonth = students.filter(leftDuring).length;
  const retainedFromStart = activeAtStart.filter((s) => !leftDuring(s)).length;

  return {
    monthStart,
    activeAtStart: activeAtStart.length,
    newEnrollments,
    left: leftInMonth,
    retentionRate: activeAtStart.length === 0 ? 100 : pct(retainedFromStart, activeAtStart.length),
    churnRate: activeAtStart.length === 0 ? 0 : pct(activeAtStart.length - retainedFromStart, activeAtStart.length),
  };
}

// ---- Academic Analytics ----

export async function academicAnalytics() {
  const [batches, subjects, attendance, homeworkSubs, testResults, atRisk, latestPerformance] = await Promise.all([
    db.batch.findMany({ select: { id: true, name: true } }),
    db.subject.findMany({ select: { id: true, name: true } }),
    db.attendance.findMany({ select: { batchId: true, subjectId: true, status: true } }),
    db.homeworkSubmission.findMany({ select: { status: true, homework: { select: { batchId: true } } } }),
    db.testResult.findMany({ where: { gradedAt: { not: null } }, select: { marksObtained: true, totalMarks: true, test: { select: { batchId: true, subjectId: true, chapter: true } } } }),
    performanceService.listAtRiskStudents(),
    db.studentPerformance.findMany({ orderBy: { calculatedAt: "desc" }, include: { student: true } }),
  ]);

  const batchName = new Map(batches.map((b) => [b.id, b.name]));
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));

  function rateBy<T>(items: T[], key: (item: T) => string, isPositive: (item: T) => boolean, nameOf: (id: string) => string) {
    const groups = new Map<string, { total: number; positive: number }>();
    for (const item of items) {
      const k = key(item);
      const g = groups.get(k) ?? { total: 0, positive: 0 };
      g.total++;
      if (isPositive(item)) g.positive++;
      groups.set(k, g);
    }
    return Array.from(groups.entries())
      .map(([id, g]) => ({ id, name: nameOf(id), rate: pct(g.positive, g.total), count: g.total }))
      .sort((a, b) => b.rate - a.rate);
  }

  const attendanceByBatch = rateBy(attendance, (a) => a.batchId, (a) => a.status === "PRESENT" || a.status === "LATE", (id) => batchName.get(id) ?? "—");
  const attendanceBySubject = rateBy(attendance, (a) => a.subjectId, (a) => a.status === "PRESENT" || a.status === "LATE", (id) => subjectName.get(id) ?? "—");
  const homeworkByBatch = rateBy(
    homeworkSubs,
    (s) => s.homework.batchId,
    (s) => s.status === "SUBMITTED" || s.status === "REVIEWED",
    (id) => batchName.get(id) ?? "—"
  );

  const testsByBatch = new Map<string, number[]>();
  const testsBySubject = new Map<string, number[]>();
  const testsByChapter = new Map<string, number[]>();
  for (const r of testResults) {
    const percent = r.totalMarks === 0 ? 0 : (r.marksObtained / r.totalMarks) * 100;
    const batchId = r.test.batchId;
    const subjectId = r.test.subjectId;
    if (!testsByBatch.has(batchId)) testsByBatch.set(batchId, []);
    testsByBatch.get(batchId)!.push(percent);
    if (!testsBySubject.has(subjectId)) testsBySubject.set(subjectId, []);
    testsBySubject.get(subjectId)!.push(percent);
    if (r.test.chapter) {
      const key = `${subjectId}::${r.test.chapter}`;
      if (!testsByChapter.has(key)) testsByChapter.set(key, []);
      testsByChapter.get(key)!.push(percent);
    }
  }
  const avg = (arr: number[]) => (arr.length === 0 ? 0 : Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10);

  const testPerformanceByBatch = Array.from(testsByBatch.entries()).map(([id, v]) => ({ id, name: batchName.get(id) ?? "—", average: avg(v) })).sort((a, b) => b.average - a.average);
  const weakestSubjects = Array.from(testsBySubject.entries()).map(([id, v]) => ({ id, name: subjectName.get(id) ?? "—", average: avg(v) })).sort((a, b) => a.average - b.average);
  const weakestChapters = Array.from(testsByChapter.entries())
    .map(([key, v]) => {
      const [subjectId, chapter] = key.split("::");
      return { subject: subjectName.get(subjectId) ?? "—", chapter, average: avg(v), count: v.length };
    })
    .sort((a, b) => a.average - b.average)
    .slice(0, 10);

  const seenStudent = new Set<string>();
  const bestPerforming = latestPerformance
    .filter((p) => {
      if (seenStudent.has(p.studentId)) return false;
      seenStudent.add(p.studentId);
      return true;
    })
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 10)
    .map((p) => ({ studentId: p.studentId, name: p.student.fullName, score: p.overallScore }));

  return {
    attendanceByBatch,
    attendanceBySubject,
    homeworkByBatch,
    testPerformanceByBatch,
    weakestSubjects,
    weakestChapters,
    bestPerforming,
    needsAttention: atRisk,
  };
}

// ---- Question Analytics ----

export interface QuestionAnalyticsRow {
  questionId: string;
  questionText: string;
  type: QuestionType;
  totalAnswers: number;
  scorePercent: number | null;
  isDifficult: boolean;
}

const DIFFICULT_THRESHOLD_PERCENT = 40;

export async function questionAnalytics(testId: string): Promise<QuestionAnalyticsRow[]> {
  const [questions, attempts] = await Promise.all([
    db.testQuestion.findMany({ where: { testId }, orderBy: { order: "asc" } }),
    db.testAttempt.findMany({ where: { testId, submittedAt: { not: null } } }),
  ]);

  return questions
    .map((q) => {
      const relevantAnswers = attempts
        .map((a) => (a.answers as Record<string, { answer: string; marksAwarded: number | null }> | null)?.[q.id])
        .filter((a): a is { answer: string; marksAwarded: number | null } => Boolean(a));

      let scorePercent: number | null = null;
      if (q.type === "MCQ" || q.type === "NUMERICAL") {
        const correct = relevantAnswers.filter((a) => a.answer.trim().toLowerCase() === (q.correctAnswer ?? "").trim().toLowerCase()).length;
        scorePercent = relevantAnswers.length === 0 ? null : pct(correct, relevantAnswers.length);
      } else {
        const graded = relevantAnswers.filter((a) => a.marksAwarded !== null);
        scorePercent = graded.length === 0 || q.marks === 0 ? null : Math.round((graded.reduce((s, a) => s + a.marksAwarded! / q.marks, 0) / graded.length) * 1000) / 10;
      }

      return {
        questionId: q.id,
        questionText: q.questionText,
        type: q.type,
        totalAnswers: relevantAnswers.length,
        scorePercent,
        isDifficult: scorePercent !== null && scorePercent < DIFFICULT_THRESHOLD_PERCENT,
      };
    })
    .sort((a, b) => (a.scorePercent ?? 100) - (b.scorePercent ?? 100));
}

// ---- Performance Trends ----

export async function performanceTrend({ batchId, days = 30 }: { batchId?: string; days?: number }) {
  const since = new Date(Date.now() - days * 86_400_000);
  const records = await db.studentPerformance.findMany({
    where: { calculatedAt: { gte: since }, batchId: batchId ?? undefined },
    orderBy: { calculatedAt: "asc" },
  });

  const buckets = new Map<string, { overall: number[]; attendance: number[]; homework: number[]; test: number[] }>();
  for (const r of records) {
    const key = r.calculatedAt.toISOString().slice(0, 10);
    if (!buckets.has(key)) buckets.set(key, { overall: [], attendance: [], homework: [], test: [] });
    const b = buckets.get(key)!;
    b.overall.push(r.overallScore);
    b.attendance.push(r.attendanceScore);
    b.homework.push(r.homeworkScore);
    b.test.push(r.testScore);
  }

  const avg = (arr: number[]) => (arr.length === 0 ? 0 : Math.round(arr.reduce((s, v) => s + v, 0) / arr.length));

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({ date, overallScore: avg(b.overall), attendanceScore: avg(b.attendance), homeworkScore: avg(b.homework), testScore: avg(b.test) }));
}

// ---- Cohort Analytics ----

export interface CohortRow {
  id: string;
  name: string;
  studentCount: number;
  avgAttendance: number;
  avgHomeworkCompletion: number;
  avgTestScore: number;
  avgOverallPerformance: number;
}

/** Side-by-side comparison of cohorts by Batch and by Academic Level — the same underlying
 * rate/average helpers as academicAnalytics() above, but grouped by a cohort dimension instead
 * of always batch/subject, and adding StudentPerformance's overall score into the same table
 * so an admin can compare cohorts on one composite number, not four separate charts. */
export async function cohortAnalytics() {
  const [batches, levels, attendance, homeworkSubs, testResults, latestPerformance] = await Promise.all([
    db.batch.findMany({ select: { id: true, name: true } }),
    db.academicLevel.findMany({ select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
    db.attendance.findMany({ select: { batchId: true, status: true, student: { select: { academicLevelId: true } } } }),
    db.homeworkSubmission.findMany({ select: { status: true, homework: { select: { batchId: true } }, student: { select: { academicLevelId: true } } } }),
    db.testResult.findMany({
      where: { gradedAt: { not: null } },
      select: { marksObtained: true, totalMarks: true, test: { select: { batchId: true, academicLevelId: true } } },
    }),
    db.studentPerformance.findMany({ orderBy: { calculatedAt: "desc" }, select: { studentId: true, overallScore: true, batchId: true, student: { select: { academicLevelId: true, batchMemberships: { select: { batchId: true } } } } } }),
  ]);

  const seenPerf = new Set<string>();
  const latestPerfPerStudent = latestPerformance.filter((p) => {
    if (seenPerf.has(p.studentId)) return false;
    seenPerf.add(p.studentId);
    return true;
  });

  function buildCohort(
    names: { id: string; name: string }[],
    attendanceKey: (a: (typeof attendance)[number]) => string | null,
    homeworkKey: (h: (typeof homeworkSubs)[number]) => string | null,
    testKey: (t: (typeof testResults)[number]) => string | null,
    perfKey: (p: (typeof latestPerfPerStudent)[number]) => string | null
  ): CohortRow[] {
    return names.map(({ id, name }) => {
      const att = attendance.filter((a) => attendanceKey(a) === id);
      const hw = homeworkSubs.filter((h) => homeworkKey(h) === id);
      const tests = testResults.filter((t) => testKey(t) === id);
      const perf = latestPerfPerStudent.filter((p) => perfKey(p) === id);
      const testPercents = tests.map((t) => (t.totalMarks === 0 ? 0 : (t.marksObtained / t.totalMarks) * 100));

      return {
        id,
        name,
        studentCount: perf.length,
        avgAttendance: pct(att.filter((a) => a.status === "PRESENT" || a.status === "LATE").length, att.length),
        avgHomeworkCompletion: pct(hw.filter((h) => h.status === "SUBMITTED" || h.status === "REVIEWED").length, hw.length),
        avgTestScore: testPercents.length === 0 ? 0 : Math.round((testPercents.reduce((s, v) => s + v, 0) / testPercents.length) * 10) / 10,
        avgOverallPerformance: perf.length === 0 ? 0 : Math.round(perf.reduce((s, p) => s + p.overallScore, 0) / perf.length),
      };
    });
  }

  const byBatch = buildCohort(
    batches,
    (a) => a.batchId,
    (h) => h.homework.batchId,
    (t) => t.test.batchId,
    (p) => p.batchId ?? p.student.batchMemberships[0]?.batchId ?? null
  );

  const byAcademicLevel = buildCohort(
    levels,
    (a) => a.student.academicLevelId,
    (h) => h.student.academicLevelId,
    (t) => t.test.academicLevelId,
    (p) => p.student.academicLevelId
  );

  return { byBatch, byAcademicLevel };
}

// ---- Teacher Analytics ----

export async function teacherAnalytics(teacherId: string) {
  const assignments = await db.batchTeacher.findMany({ where: { teacherId }, select: { batchId: true } });
  const batchIds = Array.from(new Set(assignments.map((a) => a.batchId)));

  if (batchIds.length === 0) {
    return { classesConducted: 0, avgAttendance: 0, homeworkReviewRate: 0, feedbackCompletionRate: 0, avgStudentPerformance: 0 };
  }

  const [classesConducted, attendanceRecords, homeworkSubs, perfRecords] = await Promise.all([
    db.liveClass.count({ where: { teacherId, status: "COMPLETED" } }),
    db.attendance.findMany({ where: { batchId: { in: batchIds } }, select: { status: true } }),
    db.homeworkSubmission.findMany({ where: { homework: { batchId: { in: batchIds } } }, select: { status: true, teacherFeedback: true } }),
    db.studentPerformance.findMany({ where: { batchId: { in: batchIds } }, select: { overallScore: true } }),
  ]);

  const reviewed = homeworkSubs.filter((s) => s.status === "REVIEWED").length;
  const withFeedback = homeworkSubs.filter((s) => s.teacherFeedback).length;

  return {
    classesConducted,
    avgAttendance: pct(attendanceRecords.filter((a) => a.status === "PRESENT" || a.status === "LATE").length, attendanceRecords.length),
    homeworkReviewRate: pct(reviewed, homeworkSubs.length),
    feedbackCompletionRate: pct(withFeedback, reviewed),
    avgStudentPerformance: perfRecords.length === 0 ? 0 : Math.round(perfRecords.reduce((s, p) => s + p.overallScore, 0) / perfRecords.length),
  };
}

