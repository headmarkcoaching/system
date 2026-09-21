import "server-only";
import { db } from "@/lib/db";
import type { LeadSource, LeadStage } from "@prisma/client";
import * as studentService from "@/lib/services/students";
import * as whatsappService from "@/lib/services/whatsapp";
import * as paymentsService from "@/lib/services/payments";
import { logAnalyticsEvent } from "@/lib/services/analytics-events";

export interface CreateLeadInput {
  studentName: string;
  parentName: string;
  parentPhone: string;
  whatsapp?: string;
  academicLevelId?: string;
  boardId?: string;
  groupId?: string;
  weakSubjects?: string[];
  source: LeadSource;
  campaign?: string;
  assignedCounselorId?: string | null;
  notes?: string;
}

export async function createLead(input: CreateLeadInput) {
  const lead = await db.lead.create({ data: { ...input, weakSubjects: input.weakSubjects ?? [] } });

  const phone = input.whatsapp || input.parentPhone;
  if (phone) {
    try {
      await whatsappService.sendMessage({
        recipientPhone: phone,
        templateKey: "LEAD_WELCOME",
        variables: { student_name: input.studentName, parent_name: input.parentName },
        relatedEntityType: "Lead",
        relatedEntityId: lead.id,
      });
    } catch (err) {
      console.error("LEAD_WELCOME whatsapp send failed", err);
    }
  }

  return lead;
}

export function updateLead(id: string, data: Partial<CreateLeadInput>) {
  return db.lead.update({ where: { id }, data });
}

const PAGE_SIZE = 15;

function buildLeadsWhere({ q, stage, counselorId, academicLevelId }: { q?: string; stage?: string; counselorId?: string; academicLevelId?: string }) {
  return {
    ...(stage ? { stage: stage as LeadStage } : {}),
    ...(counselorId ? { assignedCounselorId: counselorId } : {}),
    ...(academicLevelId ? { academicLevelId } : {}),
    ...(q
      ? {
          OR: [
            { studentName: { contains: q, mode: "insensitive" as const } },
            { parentName: { contains: q, mode: "insensitive" as const } },
            { parentPhone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export async function listLeads({
  page = 1,
  q,
  stage,
  counselorId,
  academicLevelId,
}: {
  page?: number;
  q?: string;
  stage?: string;
  counselorId?: string;
  academicLevelId?: string;
}) {
  const where = buildLeadsWhere({ q, stage, counselorId, academicLevelId });

  const [items, total] = await Promise.all([
    db.lead.findMany({
      where,
      include: { academicLevel: true, assignedCounselor: true, followups: { where: { completed: false }, orderBy: { dueDate: "asc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.lead.count({ where }),
  ]);

  return { items, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

// Unpaginated — every stage rendered as its own Kanban column needs the full set at once,
// not one page's worth. A counselor's own lead count stays small enough (dozens, not
// thousands) that this is safe without its own limit.
export function listLeadsForBoard({ q, counselorId, academicLevelId }: { q?: string; counselorId?: string; academicLevelId?: string }) {
  return db.lead.findMany({
    where: buildLeadsWhere({ q, counselorId, academicLevelId }),
    include: { academicLevel: true, assignedCounselor: true, followups: { where: { completed: false }, orderBy: { dueDate: "asc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });
}

export function getLeadById(id: string) {
  return db.lead.findUnique({
    where: { id },
    include: {
      academicLevel: true,
      board: true,
      group: true,
      assignedCounselor: true,
      convertedStudent: true,
      activities: { orderBy: { createdAt: "desc" } },
      followups: { orderBy: { dueDate: "asc" } },
      assessments: { orderBy: { conductedAt: "desc" } },
      trials: { orderBy: { startDate: "desc" }, include: { batch: true } },
    },
  });
}

export async function pipelineSummary(counselorId?: string) {
  const where = counselorId ? { assignedCounselorId: counselorId } : {};
  const grouped = await db.lead.groupBy({ by: ["stage"], where, _count: true });
  const stages: LeadStage[] = ["NEW", "CONTACTED", "ASSESSMENT_BOOKED", "ASSESSMENT_COMPLETED", "FREE_TRIAL", "COUNSELLING", "PAYMENT_PENDING", "ENROLLED", "LOST"];
  return stages.map((stage) => ({ stage, count: grouped.find((g) => g.stage === stage)?._count ?? 0 }));
}

export async function changeLeadStage(id: string, stage: LeadStage) {
  const lead = await db.lead.update({ where: { id }, data: { stage } });
  logAnalyticsEvent({ eventType: "LEAD_STAGE_CHANGE", entityType: "Lead", entityId: id, metadata: { stage } }).catch((err) => console.error("logAnalyticsEvent failed", err));
  return lead;
}

// ---- Activities ----

export function addLeadActivity(leadId: string, type: string, description: string, createdById: string) {
  return db.leadActivity.create({ data: { leadId, type, description, createdById } });
}

// ---- Follow-ups ----

export function addLeadFollowup(leadId: string, dueDate: string, notes?: string) {
  return db.leadFollowup.create({ data: { leadId, dueDate: new Date(dueDate), notes } });
}

export function completeLeadFollowup(id: string) {
  return db.leadFollowup.update({ where: { id }, data: { completed: true, completedAt: new Date() } });
}

export async function listFollowupsDue(counselorId?: string) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return db.leadFollowup.findMany({
    where: {
      completed: false,
      dueDate: { lte: end },
      lead: counselorId ? { assignedCounselorId: counselorId } : undefined,
    },
    include: { lead: true },
    orderBy: { dueDate: "asc" },
  });
}

// ---- Assessments ----

export interface RecordAssessmentInput {
  leadId: string;
  subjectScores?: Record<string, number>;
  overallScore?: number;
  weakSubjects?: string[];
  recommendedProgram?: string;
  documentFileId?: string;
}

export function recordAssessment(input: RecordAssessmentInput) {
  return db.assessment.create({
    data: {
      leadId: input.leadId,
      subjectScores: input.subjectScores ?? undefined,
      overallScore: input.overallScore,
      weakSubjects: input.weakSubjects ?? [],
      recommendedProgram: input.recommendedProgram,
      documentFileId: input.documentFileId,
    },
  });
}

// ---- Trials ----

export interface StartTrialInput {
  leadId: string;
  batchId?: string;
  startDate: string;
  endDate: string;
  counselorId?: string;
}

export function startTrial(input: StartTrialInput) {
  return db.trial.create({
    data: {
      leadId: input.leadId,
      batchId: input.batchId || undefined,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      counselorId: input.counselorId,
    },
  });
}

export function updateTrial(id: string, data: { classesAttended?: number; engagementNotes?: string; enrollmentStatus?: string }) {
  return db.trial.update({ where: { id }, data });
}

export function listTrialsEndingSoon(counselorId?: string, withinDays = 3) {
  const cutoff = new Date(Date.now() + withinDays * 86_400_000);
  return db.trial.findMany({
    where: {
      enrollmentStatus: "IN_PROGRESS",
      endDate: { lte: cutoff },
      counselorId: counselorId ?? undefined,
    },
    include: { lead: true, batch: true },
    orderBy: { endDate: "asc" },
  });
}

// ---- Convert to Student ----

export interface ConvertLeadPaymentPlanInput {
  totalFee: number;
  numberOfInstallments: number;
  firstDueDate: string;
}

// A payment plan is required here, not an optional follow-up step — a student created without
// one (as happened before this was enforced) is invisible to fee tracking: their parent's
// Payments page just says "contact the academy" with no plan to even contact about.
export async function convertLeadToStudent(leadId: string, createdById: string, paymentPlan: ConvertLeadPaymentPlanInput) {
  const lead = await db.lead.findUniqueOrThrow({ where: { id: leadId } });
  if (lead.convertedStudentId) {
    return db.student.findUniqueOrThrow({ where: { id: lead.convertedStudentId } });
  }
  if (!lead.academicLevelId) {
    throw new Error("This lead needs an Academic Level set before it can be converted.");
  }

  const student = await studentService.createStudent({
    fullName: lead.studentName,
    phone: lead.parentPhone,
    whatsapp: lead.whatsapp || undefined,
    academicLevelId: lead.academicLevelId,
    boardId: lead.boardId || undefined,
    groupId: lead.groupId || undefined,
    status: "ACTIVE",
    enrollmentDate: new Date().toISOString(),
    createdById,
  });

  await paymentsService.createPaymentPlan({ studentId: student.id, ...paymentPlan });
  await db.lead.update({ where: { id: leadId }, data: { stage: "ENROLLED", convertedStudentId: student.id } });

  return student;
}
