import "server-only";
import { db } from "@/lib/db";
import type { EngagementStatus } from "@prisma/client";
import * as studentService from "@/lib/services/students";
import * as participationService from "@/lib/services/participation";

// Fixed thresholds rather than a second configurable-weights settings page — Performance
// already has one configurable scoring system (Settings -> Performance Rules); a second
// fully-configurable one is more than this feature needs to be useful.
const THRESHOLDS = { highlyEngaged: 80, engaged: 60, lowEngagement: 35 } as const;

function resolveStatus(score: number): EngagementStatus {
  if (score >= THRESHOLDS.highlyEngaged) return "HIGHLY_ENGAGED";
  if (score >= THRESHOLDS.engaged) return "ENGAGED";
  if (score >= THRESHOLDS.lowEngagement) return "LOW_ENGAGEMENT";
  return "INACTIVE";
}

function loginRecencyScore(lastLoginAt: Date | null): number {
  if (!lastLoginAt) return 0;
  const daysSince = (Date.now() - lastLoginAt.getTime()) / 86_400_000;
  if (daysSince <= 1) return 100;
  if (daysSince <= 3) return 80;
  if (daysSince <= 7) return 60;
  if (daysSince <= 14) return 30;
  return 0;
}

export async function calculateEngagementScore(studentId: string) {
  const [attendance, homework, student, testsAvailable, testsAttempted, participation] = await Promise.all([
    studentService.getStudentAttendance(studentId),
    studentService.getStudentHomework(studentId),
    db.student.findUniqueOrThrow({ where: { id: studentId }, include: { user: true } }),
    db.test.count({ where: { batch: { students: { some: { studentId } } } } }),
    db.testAttempt.count({ where: { studentId } }),
    participationService.getLatestParticipationScore(studentId),
  ]);

  const attendanceComponent = studentService.computeAttendanceRate(attendance);
  const homeworkComponent = studentService.computeHomeworkCompletionRate(homework);
  const loginComponent = loginRecencyScore(student.user?.lastLoginAt ?? null);
  const testComponent = testsAvailable === 0 ? 100 : Math.round((testsAttempted / testsAvailable) * 100);
  const participationComponent = participation ?? 50; // neutral default until any participation has been recorded

  const score = Math.round(attendanceComponent * 0.25 + homeworkComponent * 0.25 + loginComponent * 0.2 + testComponent * 0.15 + participationComponent * 0.15);
  const status = resolveStatus(score);

  return db.engagementScore.create({
    data: { studentId, score, status, attendanceComponent, homeworkComponent, loginComponent, testComponent, participationComponent },
  });
}

export async function recalculateAllEngagementScores() {
  const students = await db.student.findMany({ where: { status: { in: ["ACTIVE", "TRIAL"] } }, select: { id: true } });
  const results = [];
  for (const s of students) {
    results.push(await calculateEngagementScore(s.id));
  }
  return results;
}

export function getLatestEngagementScore(studentId: string) {
  return db.engagementScore.findFirst({ where: { studentId }, orderBy: { calculatedAt: "desc" } });
}

export async function listByStatus(status?: EngagementStatus) {
  const all = await db.engagementScore.findMany({
    orderBy: { calculatedAt: "desc" },
    include: { student: { include: { academicLevel: true, batchMemberships: { include: { batch: true } } } } },
  });
  const seen = new Set<string>();
  const latestPerStudent = all.filter((r) => {
    if (seen.has(r.studentId)) return false;
    seen.add(r.studentId);
    return true;
  });
  return status ? latestPerStudent.filter((r) => r.status === status) : latestPerStudent;
}
