"use server";

import { z } from "zod";
import type { LeadSource } from "@prisma/client";
import * as leadService from "@/lib/services/leads";
import { checkRateLimit } from "@/lib/rate-limit";

const SOURCE_MAP: Record<string, LeadSource> = {
  fb: "FACEBOOK_ADS",
  facebook: "FACEBOOK_ADS",
  ig: "INSTAGRAM_ADS",
  instagram: "INSTAGRAM_ADS",
  whatsapp: "WHATSAPP",
  wa: "WHATSAPP",
  referral: "REFERRAL",
  organic: "ORGANIC",
  school: "SCHOOL_PARTNERSHIP",
};

/** Ad links control this via ?src=fb / ?src=ig — anything unrecognized (or missing, e.g. a
 * direct visit) falls back to WEBSITE rather than guessing. */
function resolveLeadSource(src?: string): LeadSource {
  if (!src) return "WEBSITE";
  return SOURCE_MAP[src.toLowerCase()] ?? "OTHER";
}

const enrollSchema = z.object({
  studentName: z.string().min(2, "Student name is required"),
  parentName: z.string().min(2, "Parent name is required"),
  parentPhone: z.string().min(7, "A valid phone number is required"),
  academicLevelId: z.string().optional(),
  groupId: z.string().optional(),
});

export interface SubmitEnrollState {
  error?: string;
  success?: boolean;
}

export async function submitEnrollAction(
  source: string | undefined,
  campaign: string | undefined,
  _prevState: SubmitEnrollState,
  formData: FormData
): Promise<SubmitEnrollState> {
  const parsed = enrollSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Public, unauthenticated form — reachable by anyone including bots. Two layers: a per-phone
  // cap (stops the same number being resubmitted repeatedly) and a coarse global backstop
  // (catches a volumetric flood using many different fake numbers).
  const phoneRate = checkRateLimit(`enroll:phone:${parsed.data.parentPhone.replace(/\D/g, "")}`, { windowMs: 60 * 60 * 1000, max: 3 });
  if (!phoneRate.allowed) return { error: "You've already submitted recently. Our team will be in touch shortly." };
  const globalRate = checkRateLimit("enroll:global", { windowMs: 5 * 60 * 1000, max: 30 });
  if (!globalRate.allowed) return { error: "Something went wrong. Please try again in a few minutes." };

  try {
    await leadService.createLead({
      studentName: parsed.data.studentName,
      parentName: parsed.data.parentName,
      parentPhone: parsed.data.parentPhone,
      academicLevelId: parsed.data.academicLevelId || undefined,
      groupId: parsed.data.groupId || undefined,
      source: resolveLeadSource(source),
      campaign: campaign || undefined,
    });
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong. Please try again." };
  }
}
