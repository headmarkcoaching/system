import "server-only";
import { db } from "@/lib/db";
import * as performanceService from "@/lib/services/performance";

export interface NextAction {
  title: string;
  description: string;
  href?: string;
  urgency: "high" | "medium" | "low";
}

/** Deterministic, rule-based recommendations — every example in the spec ("submit overdue
 * homework", "revise weak chapter", "prepare for upcoming test") is a concrete factual
 * derivation from existing data, not something needing AI language synthesis. No AI call here. */
export async function getNextActionsForStudent(studentId: string): Promise<NextAction[]> {
  const actions: NextAction[] = [];
  const now = new Date();
  const config = await performanceService.getPerformanceConfig();

  const overdueHomework = await db.homeworkSubmission.findFirst({
    where: { studentId, status: "PENDING", homework: { dueDate: { lt: now } } },
    include: { homework: { include: { subject: true } } },
    orderBy: { homework: { dueDate: "asc" } },
  });
  if (overdueHomework) {
    actions.push({
      title: "Submit overdue homework",
      description: `${overdueHomework.homework.title} (${overdueHomework.homework.subject.name}) was due ${overdueHomework.homework.dueDate.toISOString().slice(0, 10)}.`,
      href: "/student/homework",
      urgency: "high",
    });
  }

  const upcomingTest = await db.test.findFirst({
    where: {
      status: { in: ["SCHEDULED", "ACTIVE"] },
      startDate: { gte: now, lte: new Date(now.getTime() + 7 * 86_400_000) },
      batch: { students: { some: { studentId } } },
      attempts: { none: { studentId } },
    },
    include: { subject: true },
    orderBy: { startDate: "asc" },
  });
  if (upcomingTest) {
    actions.push({
      title: "Prepare for an upcoming test",
      description: `${upcomingTest.subject.name}${upcomingTest.chapter ? ` (${upcomingTest.chapter})` : ""} on ${new Date(upcomingTest.startDate).toISOString().slice(0, 10)}.`,
      href: "/student/tests",
      urgency: "medium",
    });
  }

  const weakResult = await db.testResult.findFirst({
    where: { studentId, gradedAt: { not: null } },
    include: { test: { include: { subject: true } } },
    orderBy: { gradedAt: "desc" },
  });
  if (weakResult && weakResult.totalMarks > 0) {
    const percent = (weakResult.marksObtained / weakResult.totalMarks) * 100;
    if (percent < config.atRiskTestBelow) {
      actions.push({
        title: "Revise a weak chapter",
        description: `Recent score in ${weakResult.test.subject.name}${weakResult.test.chapter ? ` (${weakResult.test.chapter})` : ""} was ${Math.round(percent)}%.`,
        href: "/student/exam-prep",
        urgency: "medium",
      });
    }
  }

  const missedClass = await db.attendance.findFirst({
    where: { studentId, status: { in: ["ABSENT", "PARTIAL", "EXCUSED"] }, date: { gte: new Date(now.getTime() - 14 * 86_400_000) }, liveClass: { recordings: { some: {} } } },
    include: { liveClass: { include: { subject: true, recordings: true } } },
    orderBy: { date: "desc" },
  });
  if (missedClass && missedClass.liveClass.recordings.length > 0) {
    actions.push({
      title: "Catch up on a missed class",
      description: `You can request the recording for ${missedClass.liveClass.subject.name} on ${missedClass.date.toISOString().slice(0, 10)} — available for 48 hours once unlocked.`,
      href: "/student/recordings",
      urgency: "low",
    });
  }

  return actions;
}
