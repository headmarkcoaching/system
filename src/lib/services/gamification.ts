import "server-only";
import { db } from "@/lib/db";

const CONFIG_ID = "singleton";

export async function getPointsConfig() {
  return db.pointsConfig.upsert({ where: { id: CONFIG_ID }, update: {}, create: { id: CONFIG_ID } });
}

export interface PointsConfigInput {
  pointsForAttendance: number;
  pointsForPerfectWeek: number;
  pointsForHomeworkSubmit: number;
  pointsForHomeworkReviewed: number;
  pointsForHighTestScore: number;
  highTestScoreThreshold: number;
  pointsForParticipation: number;
  pointsForStudyStreak: number;
  studyStreakDays: number;
}

export async function updatePointsConfig(data: PointsConfigInput, updatedById: string) {
  return db.pointsConfig.upsert({ where: { id: CONFIG_ID }, update: { ...data, updatedById }, create: { id: CONFIG_ID, ...data, updatedById } });
}

// ---- Points ----

export function awardPoints(studentId: string, points: number, reason: string, source?: string) {
  return db.studentPoint.create({ data: { studentId, points, reason, source } });
}

/** Awards points only if no StudentPoint with this exact `reason` already exists for this student — a simple
 * dedup guard (same idea as Phase 4A's automation marker pattern) so a hook that fires more than once for the
 * same real-world event (e.g. re-saving the same attendance row) doesn't double-award. */
export async function awardPointsOnce(studentId: string, dedupKey: string, points: number, source?: string) {
  const existing = await db.studentPoint.findFirst({ where: { studentId, reason: dedupKey } });
  if (existing) return null;
  return db.studentPoint.create({ data: { studentId, points, reason: dedupKey, source } });
}

export async function getStudentPointsTotal(studentId: string) {
  const result = await db.studentPoint.aggregate({ where: { studentId }, _sum: { points: true } });
  return result._sum.points ?? 0;
}

export function listPointsHistory(studentId: string, limit = 20) {
  return db.studentPoint.findMany({ where: { studentId }, orderBy: { awardedAt: "desc" }, take: limit });
}

// ---- Event hooks (called from other services; never throw — a gamification side-effect must never block
// the primary action it's attached to) ----

export async function onAttendanceMarked(studentId: string, liveClassId: string, status: string) {
  if (status !== "PRESENT") return;
  const config = await getPointsConfig();
  await awardPointsOnce(studentId, `attendance:${liveClassId}`, config.pointsForAttendance, "ATTENDANCE");
  await checkPerfectWeek(studentId, config.pointsForPerfectWeek);
}

async function checkPerfectWeek(studentId: string, bonusPoints: number) {
  const recent = await db.attendance.findMany({ where: { studentId }, orderBy: { date: "desc" }, take: 5 });
  if (recent.length < 5 || !recent.every((a) => a.status === "PRESENT")) return;
  const now = new Date();
  const isoWeek = `${now.getFullYear()}-W${Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7)}-${now.getMonth()}`;
  await awardPointsOnce(studentId, `perfect-week:${isoWeek}`, bonusPoints, "PERFECT_ATTENDANCE");
}

export async function onHomeworkSubmitted(studentId: string, submissionId: string) {
  const config = await getPointsConfig();
  await awardPointsOnce(studentId, `homework-submit:${submissionId}`, config.pointsForHomeworkSubmit, "HOMEWORK");
}

export async function onHomeworkReviewed(studentId: string, submissionId: string, status: string) {
  if (status !== "REVIEWED") return;
  const config = await getPointsConfig();
  await awardPointsOnce(studentId, `homework-review:${submissionId}`, config.pointsForHomeworkReviewed, "HOMEWORK");
}

export async function onTestGraded(studentId: string, testId: string, marksObtained: number, totalMarks: number) {
  if (totalMarks === 0) return;
  const config = await getPointsConfig();
  const percent = (marksObtained / totalMarks) * 100;
  if (percent < config.highTestScoreThreshold) return;
  await awardPointsOnce(studentId, `high-score:${testId}`, config.pointsForHighTestScore, "TEST");
}

export async function onParticipationRecorded(studentId: string, participationId: string) {
  const config = await getPointsConfig();
  await awardPointsOnce(studentId, `participation:${participationId}`, config.pointsForParticipation, "PARTICIPATION");
}

/** Study streak: consecutive calendar days with at least one PRESENT attendance record, computed from real
 * attendance data rather than a separate daily-login tracker. Awards once per streak reaching the configured
 * length (a fresh streak that later reaches the same length again — after a break — awards again). */
export async function checkAndAwardStudyStreak(studentId: string) {
  const config = await getPointsConfig();
  const records = await db.attendance.findMany({
    where: { studentId, status: { in: ["PRESENT", "LATE"] } },
    orderBy: { date: "desc" },
    select: { date: true },
    take: 60,
  });
  const days = Array.from(new Set(records.map((r) => r.date.toISOString().slice(0, 10)))).sort().reverse();
  if (days.length === 0) return;

  let streak = 1;
  for (let i = 0; i < days.length - 1; i++) {
    const cur = new Date(days[i]);
    const next = new Date(days[i + 1]);
    const diffDays = Math.round((cur.getTime() - next.getTime()) / 86_400_000);
    if (diffDays === 1) streak++;
    else break;
  }

  if (streak >= config.studyStreakDays) {
    await awardPointsOnce(studentId, `streak:${streak}:${days[0]}`, config.pointsForStudyStreak, "STREAK");
  }
}

// ---- Badges ----

export function listBadges() {
  return db.badge.findMany({ orderBy: { name: "asc" } });
}

export function createBadge(input: { name: string; description?: string; iconUrl?: string }) {
  return db.badge.create({ data: input });
}

export function updateBadge(id: string, data: { name?: string; description?: string; iconUrl?: string }) {
  return db.badge.update({ where: { id }, data });
}

export async function awardBadge(studentId: string, badgeId: string, note?: string) {
  const existing = await db.studentBadge.findUnique({ where: { studentId_badgeId: { studentId, badgeId } } });
  if (existing) return existing;
  return db.studentBadge.create({ data: { studentId, badgeId, note } });
}

export function listBadgesForStudent(studentId: string) {
  return db.studentBadge.findMany({ where: { studentId }, include: { badge: true }, orderBy: { awardedAt: "desc" } });
}

// ---- Leaderboard ----

export interface LeaderboardRow {
  rank: number;
  studentId: string;
  name: string;
  studentCode: string;
  points: number;
  badges: number;
}

export async function leaderboard({ scope, scopeId }: { scope: "batch" | "level" | "month"; scopeId?: string }): Promise<LeaderboardRow[]> {
  let studentIds: string[] | undefined;
  let awardedAtFilter: { gte: Date } | undefined;

  if (scope === "batch") {
    if (!scopeId) return [];
    const batch = await db.batch.findUnique({ where: { id: scopeId }, select: { leaderboardEnabled: true } });
    if (!batch?.leaderboardEnabled) return [];
    const members = await db.batchStudent.findMany({ where: { batchId: scopeId }, select: { studentId: true } });
    studentIds = members.map((m) => m.studentId);
  } else if (scope === "level") {
    if (!scopeId) return [];
    const students = await db.student.findMany({ where: { academicLevelId: scopeId }, select: { id: true } });
    studentIds = students.map((s) => s.id);
  } else {
    const now = new Date();
    awardedAtFilter = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  }

  if (studentIds && studentIds.length === 0) return [];

  const grouped = await db.studentPoint.groupBy({
    by: ["studentId"],
    where: { studentId: studentIds ? { in: studentIds } : undefined, awardedAt: awardedAtFilter },
    _sum: { points: true },
  });

  if (grouped.length === 0) return [];

  const ids = grouped.map((g) => g.studentId);
  const [studentInfo, badgeCounts] = await Promise.all([
    db.student.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true, studentCode: true } }),
    db.studentBadge.groupBy({ by: ["studentId"], where: { studentId: { in: ids } }, _count: true }),
  ]);
  const infoMap = new Map(studentInfo.map((s) => [s.id, s]));
  const badgeMap = new Map(badgeCounts.map((b) => [b.studentId, b._count]));

  return grouped
    .map((g) => ({
      studentId: g.studentId,
      name: infoMap.get(g.studentId)?.fullName ?? "—",
      studentCode: infoMap.get(g.studentId)?.studentCode ?? "",
      points: g._sum.points ?? 0,
      badges: badgeMap.get(g.studentId) ?? 0,
    }))
    .sort((a, b) => b.points - a.points)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}
