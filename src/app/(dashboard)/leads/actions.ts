"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { RoleKey } from "@prisma/client";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { assertCanManageLead, getCounselorRecordForUser } from "@/lib/access";
import { logAudit } from "@/lib/audit";
import * as leadService from "@/lib/services/leads";
import * as referralsService from "@/lib/services/referrals";
import * as uploadedFilesService from "@/lib/services/uploaded-files";

const COUNSELOR_ROLES: RoleKey[] = [...STAFF_ROLES, "COUNSELOR"];

function revalidateLead(id: string) {
  revalidatePath(`/leads/${id}`);
  revalidatePath("/admin/leads");
  revalidatePath("/counselor/leads");
  revalidatePath("/counselor");
  revalidatePath("/admin");
}

const createLeadSchema = z.object({
  studentName: z.string().min(2, "Student name is required"),
  parentName: z.string().min(2, "Parent name is required"),
  parentPhone: z.string().min(6, "Parent phone is required"),
  whatsapp: z.string().optional(),
  academicLevelId: z.string().optional(),
  boardId: z.string().optional(),
  groupId: z.string().optional(),
  source: z.enum(["FACEBOOK_ADS", "INSTAGRAM_ADS", "WHATSAPP", "WEBSITE", "REFERRAL", "ORGANIC", "SCHOOL_PARTNERSHIP", "OTHER"]),
  campaign: z.string().optional(),
  assignedCounselorId: z.string().optional(),
  notes: z.string().optional(),
});

export interface CreateLeadState {
  error?: string;
}

export async function createLeadAction(_prevState: CreateLeadState, formData: FormData): Promise<CreateLeadState> {
  const session = await requireRoleSession(COUNSELOR_ROLES);
  const parsed = createLeadSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const lead = await leadService.createLead(parsed.data);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "Lead", entityId: lead.id, after: lead });

  revalidatePath("/admin/leads");
  revalidatePath("/counselor/leads");
  redirect(`/leads/${lead.id}`);
}

export async function assignLeadCounselorAction(leadId: string, counselorId: string) {
  const session = await requireRoleSession(STAFF_ROLES);
  const record = await leadService.updateLead(leadId, { assignedCounselorId: counselorId === "unassigned" ? null : counselorId });
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Lead", entityId: leadId, after: record });
  revalidateLead(leadId);
}

const updateLeadSchema = z.object({
  notes: z.string().optional(),
  weakSubjectsText: z.string().optional(),
  campaign: z.string().optional(),
});

export async function updateLeadAction(leadId: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(COUNSELOR_ROLES);
  await assertCanManageLead(session, leadId);
  const parsed = updateLeadSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await leadService.updateLead(leadId, {
    notes: parsed.data.notes,
    campaign: parsed.data.campaign,
    weakSubjects: parsed.data.weakSubjectsText ? parsed.data.weakSubjectsText.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
  });
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Lead", entityId: leadId, after: record });
  revalidateLead(leadId);
}

export async function changeLeadStageAction(leadId: string, stage: string) {
  const session = await requireRoleSession(COUNSELOR_ROLES);
  await assertCanManageLead(session, leadId);
  await leadService.changeLeadStage(leadId, stage as never);
  await logAudit({ actorId: session.user.id, action: "STATUS_CHANGE", entityType: "Lead", entityId: leadId, after: { stage } });
  try {
    await referralsService.onLeadStageChange(leadId, stage as never);
  } catch (err) {
    console.error("referralsService.onLeadStageChange failed", err);
  }
  revalidateLead(leadId);
}

export async function addLeadActivityAction(leadId: string, type: string, description: string) {
  const session = await requireRoleSession(COUNSELOR_ROLES);
  await assertCanManageLead(session, leadId);
  if (!description.trim()) return { error: "Add a description." };
  await leadService.addLeadActivity(leadId, type, description.trim(), session.user.id);
  revalidateLead(leadId);
}

export async function addLeadFollowupAction(leadId: string, dueDate: string, notes?: string) {
  const session = await requireRoleSession(COUNSELOR_ROLES);
  await assertCanManageLead(session, leadId);
  if (!dueDate) return { error: "Set a due date." };
  await leadService.addLeadFollowup(leadId, dueDate, notes);
  revalidateLead(leadId);
}

export async function completeLeadFollowupAction(leadId: string, followupId: string) {
  const session = await requireRoleSession(COUNSELOR_ROLES);
  await assertCanManageLead(session, leadId);
  await leadService.completeLeadFollowup(followupId);
  revalidateLead(leadId);
}

const assessmentSchema = z.object({
  overallScore: z.coerce.number().min(0).max(100).optional(),
  weakSubjectsText: z.string().optional(),
  recommendedProgram: z.string().optional(),
});

/** The assessment itself always happens outside the app (a call, an in-person session, a paper
 * test) — this just records it. A document is required rather than optional so the record is
 * always backed by real evidence, not a number someone typed in from memory. */
export interface RecordAssessmentState {
  error?: string;
}

export async function recordAssessmentAction(leadId: string, formData: FormData): Promise<RecordAssessmentState> {
  const session = await requireRoleSession(COUNSELOR_ROLES);
  await assertCanManageLead(session, leadId);

  const parsed = assessmentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Attach the assessment document (photo, scanned paper, or PDF)." };
  }

  let documentFileId: string;
  try {
    const uploaded = await uploadedFilesService.uploadFile({ file, purpose: "LEAD_ASSESSMENT", uploadedById: session.user.id });
    documentFileId = uploaded.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not upload the document." };
  }

  await leadService.recordAssessment({
    leadId,
    overallScore: parsed.data.overallScore,
    weakSubjects: parsed.data.weakSubjectsText
      ? parsed.data.weakSubjectsText.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    recommendedProgram: parsed.data.recommendedProgram,
    documentFileId,
  });
  await leadService.changeLeadStage(leadId, "ASSESSMENT_COMPLETED");
  revalidateLead(leadId);
  return {};
}

const trialSchema = z.object({
  batchId: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

export async function startTrialAction(leadId: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(COUNSELOR_ROLES);
  await assertCanManageLead(session, leadId);
  const parsed = trialSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const counselor = await getCounselorRecordForUser(session.user.id);
  await leadService.startTrial({ leadId, ...parsed.data, counselorId: counselor?.id });
  await leadService.changeLeadStage(leadId, "FREE_TRIAL");
  revalidateLead(leadId);
}

export async function updateTrialAction(leadId: string, trialId: string, data: { classesAttended?: number; engagementNotes?: string; enrollmentStatus?: string }) {
  const session = await requireRoleSession(COUNSELOR_ROLES);
  await assertCanManageLead(session, leadId);
  await leadService.updateTrial(trialId, data);
  revalidateLead(leadId);
}

const convertLeadPaymentPlanSchema = z.object({
  totalFee: z.coerce.number().positive("Total fee must be greater than 0"),
  numberOfInstallments: z.coerce.number().int().min(1, "At least 1 installment is required"),
  firstDueDate: z.string().min(1, "First due date is required"),
});

export async function convertLeadToStudentAction(leadId: string, paymentPlanData: Record<string, unknown>) {
  const session = await requireRoleSession(COUNSELOR_ROLES);
  await assertCanManageLead(session, leadId);
  const parsed = convertLeadPaymentPlanSchema.safeParse(paymentPlanData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const student = await leadService.convertLeadToStudent(leadId, session.user.id, parsed.data);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "Student", entityId: student.id, after: { convertedFromLead: leadId } });
  try {
    await referralsService.onLeadEnrolled(leadId, student.id);
  } catch (err) {
    console.error("referralsService.onLeadEnrolled failed", err);
  }
  revalidateLead(leadId);
  revalidatePath("/admin/students");
  return { studentId: student.id };
}
