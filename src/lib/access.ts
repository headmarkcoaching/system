import "server-only";
import { db } from "@/lib/db";
import { ForbiddenError, STAFF_ROLES } from "@/lib/permissions";
import type { Session } from "next-auth";

/** Staff (admin/super admin) always pass. A teacher passes only if assigned to the batch. Everyone else is rejected. */
export async function assertCanManageBatch(session: Session, batchId: string) {
  if (STAFF_ROLES.includes(session.user.role)) return;

  if (session.user.role === "TEACHER") {
    const teacher = await db.teacher.findUnique({ where: { userId: session.user.id } });
    if (teacher) {
      const assigned = await db.batchTeacher.findFirst({ where: { batchId, teacherId: teacher.id } });
      if (assigned) return;
    }
  }

  throw new ForbiddenError("You do not have access to this batch.");
}

export async function getTeacherRecordForUser(userId: string) {
  return db.teacher.findUnique({ where: { userId } });
}

/** Staff always pass. A teacher passes only if assigned to the test's batch. Everyone else is rejected. */
export async function assertCanManageTest(session: Session, testId: string) {
  if (STAFF_ROLES.includes(session.user.role)) return;

  if (session.user.role === "TEACHER") {
    const teacher = await db.teacher.findUnique({ where: { userId: session.user.id } });
    if (teacher) {
      const test = await db.test.findUnique({ where: { id: testId }, select: { batchId: true } });
      if (test) {
        const assigned = await db.batchTeacher.findFirst({ where: { batchId: test.batchId, teacherId: teacher.id } });
        if (assigned) return;
      }
    }
  }

  throw new ForbiddenError("You do not have access to this test.");
}

/** Staff always pass. A counselor passes only if they're the assigned counselor on this lead. Everyone else is rejected. */
export async function assertCanManageLead(session: Session, leadId: string) {
  if (STAFF_ROLES.includes(session.user.role)) return;

  if (session.user.role === "COUNSELOR") {
    const counselor = await db.counselor.findUnique({ where: { userId: session.user.id } });
    if (counselor) {
      const lead = await db.lead.findUnique({ where: { id: leadId }, select: { assignedCounselorId: true } });
      if (lead?.assignedCounselorId === counselor.id) return;
    }
  }

  throw new ForbiddenError("You do not have access to this lead.");
}

export async function getCounselorRecordForUser(userId: string) {
  return db.counselor.findUnique({ where: { userId } });
}

/** Staff always pass. Anyone else passes only if they raised this ticket themselves. */
export async function assertCanManageSupportTicket(session: Session, ticketId: string) {
  if (STAFF_ROLES.includes(session.user.role)) return;

  const ticket = await db.supportTicket.findUnique({ where: { id: ticketId }, select: { raisedById: true } });
  if (ticket?.raisedById === session.user.id) return;

  throw new ForbiddenError("You do not have access to this ticket.");
}
