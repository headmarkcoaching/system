import "server-only";
import { db } from "@/lib/db";

/** Days after an instalment's due date before an unpaid fee stops a student joining live classes. */
export const PAYMENT_GRACE_DAYS = 2;

export type ClassBlockReason = "NOT_IN_BATCH" | "NOT_ACTIVE" | "FEE_OVERDUE" | "NO_FEE_PLAN" | "CLASS_NOT_LIVE";

export interface ClassAccess {
  allowed: boolean;
  reason?: ClassBlockReason;
  /** Plain words for the student or parent. */
  message?: string;
  overdueAmount?: number;
  /** True when a staff exception is what is letting them in. */
  viaOverride?: boolean;
}

/**
 * Whether a student may join live classes right now. "Paid" means: enrolment is active and no
 * instalment of their latest fee plan is overdue by more than the grace period. A trial student is
 * allowed (trials are managed separately). A student with no fee plan at all is NOT allowed, since
 * nothing says they have paid; a staff exception covers scholarships and special cases.
 *
 * This is the single rule. The student's home page and the "join" action both use it, so what a
 * student is told and what the server enforces can never disagree.
 */
export async function getClassAccess(studentId: string, now = new Date()): Promise<ClassAccess> {
  const student = await db.student.findUnique({
    where: { id: studentId },
    select: {
      status: true,
      classAccessOverrideUntil: true,
      paymentPlans: { orderBy: { createdAt: "desc" }, take: 1, select: { installments: { select: { amount: true, dueDate: true, status: true } } } },
    },
  });
  if (!student) return { allowed: false, reason: "NOT_ACTIVE", message: "Your student profile wasn't found." };

  if (student.classAccessOverrideUntil && student.classAccessOverrideUntil > now) return { allowed: true, viaOverride: true };

  if (student.status === "INACTIVE" || student.status === "ALUMNI") {
    return { allowed: false, reason: "NOT_ACTIVE", message: "Your enrolment isn't active, so live classes are closed to you. Please contact the academy." };
  }
  if (student.status === "TRIAL") return { allowed: true };

  const plan = student.paymentPlans[0];
  if (!plan) {
    return { allowed: false, reason: "NO_FEE_PLAN", message: "Your fee plan hasn't been set up yet. Please contact the academy to confirm your fee before joining live classes." };
  }

  const cutoff = new Date(now.getTime() - PAYMENT_GRACE_DAYS * 24 * 60 * 60 * 1000);
  const overdue = plan.installments.filter((i) => i.status !== "PAID" && i.dueDate < cutoff);
  if (overdue.length > 0) {
    const overdueAmount = overdue.reduce((sum, i) => sum + Number(i.amount), 0);
    return {
      allowed: false,
      reason: "FEE_OVERDUE",
      overdueAmount,
      message: "Your fee is overdue, so live classes are paused. Please ask your parent to pay it. Once it is paid, you can join again.",
    };
  }
  return { allowed: true };
}

/**
 * The meeting link for one live class, released only if the student may join it. This is the only
 * code path that hands the link to a student, so it is never sitting in a page for others to read.
 */
export async function getLiveClassJoinLink(studentId: string, liveClassId: string): Promise<{ url?: string; error?: string; reason?: ClassBlockReason }> {
  const liveClass = await db.liveClass.findUnique({ where: { id: liveClassId }, select: { batchId: true, status: true, meetingLink: true } });
  if (!liveClass) return { error: "That class no longer exists." };

  const member = await db.batchStudent.findFirst({ where: { studentId, batchId: liveClass.batchId }, select: { id: true } });
  if (!member) return { error: "This class isn't part of your batch.", reason: "NOT_IN_BATCH" };

  if (liveClass.status !== "LIVE") return { error: "This class isn't live right now.", reason: "CLASS_NOT_LIVE" };

  const access = await getClassAccess(studentId);
  if (!access.allowed) return { error: access.message ?? "You can't join this class right now.", reason: access.reason };

  return { url: liveClass.meetingLink };
}

/** Staff exception: let a student join until the end of the given number of days. 0 removes it. */
export async function setClassAccessOverride(studentId: string, days: number) {
  const until = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
  await db.student.update({ where: { id: studentId }, data: { classAccessOverrideUntil: until } });
  return until;
}
