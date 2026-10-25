"use server";

import { z } from "zod";
import type { LeadSource } from "@prisma/client";
import * as leadService from "@/lib/services/leads";
import { checkRateLimit } from "@/lib/rate-limit";
import { filledBySchema, optionalEmailSchema, readSiblingNames, typedValues, type LeadFormValues } from "@/lib/lead-contact";

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
  academicLevelId: z.string().min(1, "Please choose your class"),
  groupId: z.string().optional(),
  filledBy: filledBySchema,
  email: optionalEmailSchema,
});

export interface SubmitEnrollState {
  error?: string;
  values?: LeadFormValues;
  success?: boolean;
}

export async function submitEnrollAction(
  source: string | undefined,
  campaign: string | undefined,
  _prevState: SubmitEnrollState,
  formData: FormData
): Promise<SubmitEnrollState> {
  // Sent back with any error: React empties the form after an action, so the family's typing is returned to refill it.
  const values = typedValues(formData);
  const parsed = enrollSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { values, error: parsed.error.issues[0].message };
  const subjectIds = formData.getAll("subjectIds").filter((v): v is string => typeof v === "string" && v.length > 0);
  const siblings = readSiblingNames(formData);
  if (siblings.error) return { values, error: siblings.error };

  // Public, unauthenticated form — reachable by anyone including bots. Two layers: a per-phone
  // cap (stops the same number being resubmitted repeatedly) and a coarse global backstop
  // (catches a volumetric flood using many different fake numbers).
  const phoneRate = await checkRateLimit(`enroll:phone:${parsed.data.parentPhone.replace(/\D/g, "")}`, { windowMs: 60 * 60 * 1000, max: 3 });
  if (!phoneRate.allowed) return { values, error: "You've already submitted recently. Our team will be in touch shortly." };
  const globalRate = await checkRateLimit("enroll:global", { windowMs: 5 * 60 * 1000, max: 30 });
  if (!globalRate.allowed) return { values, error: "Something went wrong. Please try again in a few minutes." };

  let interestedSubjects: string[];
  try {
    interestedSubjects = await leadService.resolveInterestedSubjects(subjectIds, parsed.data.academicLevelId, parsed.data.groupId || undefined);
  } catch (err) {
    return { values, error: err instanceof Error ? err.message : "Please choose a subject." };
  }
  // Only a class with no subjects listed may go without one; the team then asks on WhatsApp.
  if (interestedSubjects.length === 0 && (await leadService.classHasSubjects(parsed.data.academicLevelId))) {
    return { values, error: "Please choose at least one subject you want to try." };
  }

  try {
    await leadService.createLead({
      studentName: parsed.data.studentName,
      parentName: parsed.data.parentName,
      parentPhone: parsed.data.parentPhone,
      academicLevelId: parsed.data.academicLevelId,
      groupId: parsed.data.groupId || undefined,
      interestedSubjects,
      filledBy: parsed.data.filledBy,
      contactEmail: parsed.data.email,
      siblingNames: siblings.names,
      source: resolveLeadSource(source),
      campaign: campaign || undefined,
    });
    return { success: true };
  } catch (err) {
    return { values, error: err instanceof Error ? err.message : "Something went wrong. Please try again." };
  }
}
