import "server-only";
import { db } from "@/lib/db";
import type { RewardType, LeadStage } from "@prisma/client";
import * as leadService from "@/lib/services/leads";
import * as gamificationService from "@/lib/services/gamification";

function randomCode(prefix: string) {
  return `${prefix}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function generateUniqueCode(prefix: string, exists: (code: string) => Promise<boolean>): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = randomCode(prefix);
    if (!(await exists(code))) return code;
  }
  return `${randomCode(prefix)}${Date.now().toString(36).toUpperCase()}`;
}

export async function getOrCreateReferralCode(kind: "student" | "parent", id: string): Promise<string> {
  if (kind === "student") {
    const student = await db.student.findUniqueOrThrow({ where: { id } });
    if (student.referralCode) return student.referralCode;
    const code = await generateUniqueCode("STU-", async (c) => Boolean(await db.student.findUnique({ where: { referralCode: c } })));
    await db.student.update({ where: { id }, data: { referralCode: code } });
    return code;
  }
  const parent = await db.parent.findUniqueOrThrow({ where: { id } });
  if (parent.referralCode) return parent.referralCode;
  const code = await generateUniqueCode("PAR-", async (c) => Boolean(await db.parent.findUnique({ where: { referralCode: c } })));
  await db.parent.update({ where: { id }, data: { referralCode: code } });
  return code;
}

async function resolveReferrer(code: string): Promise<{ referrerStudentId?: string; referrerParentId?: string; referrerName: string } | null> {
  if (code.startsWith("STU-")) {
    const student = await db.student.findUnique({ where: { referralCode: code } });
    if (!student) return null;
    return { referrerStudentId: student.id, referrerName: student.fullName };
  }
  if (code.startsWith("PAR-")) {
    const parent = await db.parent.findUnique({ where: { referralCode: code } });
    if (!parent) return null;
    return { referrerParentId: parent.id, referrerName: parent.fullName };
  }
  return null;
}

/** Public lookup for the /refer/[code] landing page — only exposes the referrer's first name, nothing sensitive. */
export async function getReferrerNameForCode(code: string): Promise<string | null> {
  const referrer = await resolveReferrer(code);
  return referrer?.referrerName ?? null;
}

export interface CreateReferralInput {
  code: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  academicLevelId?: string;
}

/** Public referral-link submission: validates the code, creates a real Lead (reusing the
 * existing lead-intake pipeline, which already sends the LEAD_WELCOME WhatsApp message),
 * and records the Referral linking the referrer to that new lead. */
export async function createReferralFromCode(input: CreateReferralInput) {
  const referrer = await resolveReferrer(input.code);
  if (!referrer) throw new Error("This referral link isn't valid.");

  const lead = await leadService.createLead({
    studentName: input.studentName,
    parentName: input.parentName,
    parentPhone: input.parentPhone,
    academicLevelId: input.academicLevelId,
    source: "REFERRAL",
  });

  const referral = await db.referral.create({
    data: {
      referrerStudentId: referrer.referrerStudentId,
      referrerParentId: referrer.referrerParentId,
      referralCode: input.code,
      referredName: input.studentName,
      referredPhone: input.parentPhone,
      status: "REGISTERED",
      convertedLeadId: lead.id,
    },
  });

  return { referral, lead };
}

/** Called from leadService.changeLeadStage — progresses a linked Referral's status as its lead moves through the pipeline. */
export async function onLeadStageChange(leadId: string, stage: LeadStage) {
  const referral = await db.referral.findUnique({ where: { convertedLeadId: leadId } });
  if (!referral || referral.status === "ENROLLED" || referral.status === "REWARDED") return;

  if (stage === "FREE_TRIAL" && referral.status !== "TRIAL") {
    await db.referral.update({ where: { id: referral.id }, data: { status: "TRIAL" } });
  }
}

/** Called from leadService.convertLeadToStudent once a lead becomes a real Student. */
export async function onLeadEnrolled(leadId: string, studentId: string) {
  const referral = await db.referral.findUnique({ where: { convertedLeadId: leadId } });
  if (!referral) return;
  await db.referral.update({ where: { id: referral.id }, data: { status: "ENROLLED", convertedStudentId: studentId } });
}

export async function grantReward(referralId: string, rewardType: RewardType, description: string | undefined, value: number | undefined, grantedById: string) {
  const reward = await db.referralReward.create({ data: { referralId, rewardType, description, value, grantedById } });
  const referral = await db.referral.update({ where: { id: referralId }, data: { status: "REWARDED" } });

  if (rewardType === "POINTS" && value && referral.referrerStudentId) {
    await gamificationService.awardPoints(referral.referrerStudentId, Math.round(value), `Referral reward: ${referral.referredName}`, "REFERRAL");
  }

  return reward;
}

export function listAllReferrals() {
  return db.referral.findMany({
    include: { referrerStudent: true, referrerParent: true, rewards: true, convertedLead: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function referralDashboardStats() {
  const [total, registered, trials, enrolled, rewards] = await Promise.all([
    db.referral.count(),
    db.referral.count({ where: { status: "REGISTERED" } }),
    db.referral.count({ where: { status: "TRIAL" } }),
    db.referral.count({ where: { status: { in: ["ENROLLED", "REWARDED"] } } }),
    db.referralReward.count(),
  ]);
  return { total, registered, trials, enrolled, rewards };
}

export async function statsForReferrer(kind: "student" | "parent", id: string) {
  const where = kind === "student" ? { referrerStudentId: id } : { referrerParentId: id };
  const referrals = await db.referral.findMany({ where, orderBy: { createdAt: "desc" } });
  return {
    referrals,
    total: referrals.length,
    registered: referrals.filter((r) => r.status === "REGISTERED").length,
    trials: referrals.filter((r) => r.status === "TRIAL").length,
    enrolled: referrals.filter((r) => r.status === "ENROLLED" || r.status === "REWARDED").length,
  };
}
