import "server-only";
import { db } from "@/lib/db";
import type { InterventionStatus } from "@prisma/client";

export interface CreateInterventionInput {
  studentId: string;
  reason: string;
  actionPlan: string;
  responsibleStaffId: string;
  startDate: string;
  reviewDate: string;
  createdById: string;
}

export function createIntervention(input: CreateInterventionInput) {
  return db.intervention.create({
    data: {
      studentId: input.studentId,
      reason: input.reason,
      actionPlan: input.actionPlan,
      responsibleStaffId: input.responsibleStaffId,
      startDate: new Date(input.startDate),
      reviewDate: new Date(input.reviewDate),
      createdById: input.createdById,
    },
  });
}

export function updateIntervention(id: string, data: { status?: InterventionStatus; actionPlan?: string; reviewDate?: string }) {
  return db.intervention.update({
    where: { id },
    data: { status: data.status, actionPlan: data.actionPlan, reviewDate: data.reviewDate ? new Date(data.reviewDate) : undefined },
  });
}

export function listForStudent(studentId: string) {
  return db.intervention.findMany({ where: { studentId }, include: { responsibleStaff: true }, orderBy: { createdAt: "desc" } });
}

const PAGE_SIZE = 20;

/** Paginated — found during the Phase 3E performance review that this previously fetched every
 * intervention ever created with no limit at all, unlike Students/Batches/Parents (which have
 * had pagination since Phase 1). Interventions accumulate for the life of every at-risk case,
 * so this was a genuine "prepare for thousands of students" gap, not a hypothetical one. */
export async function listAll(filters?: { status?: InterventionStatus; page?: number }) {
  const page = filters?.page ?? 1;
  const where = { status: filters?.status };

  const [items, total] = await Promise.all([
    db.intervention.findMany({
      where,
      include: { student: true, responsibleStaff: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.intervention.count({ where }),
  ]);

  return { items, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
