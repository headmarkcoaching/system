"use server";

import { z } from "zod";
import * as leadService from "@/lib/services/leads";
import * as referralsService from "@/lib/services/referrals";
import { checkRateLimit } from "@/lib/rate-limit";
import { filledBySchema, optionalEmailSchema, readSiblingNames, typedValues, type LeadFormValues } from "@/lib/lead-contact";

const referralSchema = z.object({
  studentName: z.string().min(2, "Student name is required"),
  parentName: z.string().min(2, "Parent name is required"),
  parentPhone: z.string().min(7, "A valid phone number is required"),
  academicLevelId: z.string().min(1, "Please choose your class"),
  filledBy: filledBySchema,
  email: optionalEmailSchema,
});

export interface SubmitReferralState {
  error?: string;
  values?: LeadFormValues;
  success?: boolean;
}

export async function submitReferralAction(code: string, _prevState: SubmitReferralState, formData: FormData): Promise<SubmitReferralState> {
  // Sent back with any error: React empties the form after an action, so the family's typing is returned to refill it.
  const values = typedValues(formData);
  const parsed = referralSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { values, error: parsed.error.issues[0].message };
  const subjectIds = formData.getAll("subjectIds").filter((v): v is string => typeof v === "string" && v.length > 0);
  const siblings = readSiblingNames(formData);
  if (siblings.error) return { values, error: siblings.error };

  // Same reasoning as /enroll: a public, unauthenticated form needs abuse protection.
  const phoneRate = await checkRateLimit(`referral:phone:${parsed.data.parentPhone.replace(/\D/g, "")}`, { windowMs: 60 * 60 * 1000, max: 3 });
  if (!phoneRate.allowed) return { values, error: "You've already submitted recently. Our team will be in touch shortly." };
  const globalRate = await checkRateLimit("referral:global", { windowMs: 5 * 60 * 1000, max: 30 });
  if (!globalRate.allowed) return { values, error: "Something went wrong. Please try again in a few minutes." };

  let interestedSubjects: string[];
  try {
    interestedSubjects = await leadService.resolveInterestedSubjects(subjectIds, parsed.data.academicLevelId);
  } catch (err) {
    return { values, error: err instanceof Error ? err.message : "Please choose a subject." };
  }
  if (interestedSubjects.length === 0 && (await leadService.classHasSubjects(parsed.data.academicLevelId))) {
    return { values, error: "Please choose at least one subject you want to try." };
  }

  try {
    await referralsService.createReferralFromCode({
      code,
      studentName: parsed.data.studentName,
      parentName: parsed.data.parentName,
      parentPhone: parsed.data.parentPhone,
      academicLevelId: parsed.data.academicLevelId,
      interestedSubjects,
      filledBy: parsed.data.filledBy,
      contactEmail: parsed.data.email,
      siblingNames: siblings.names,
    });
    return { success: true };
  } catch (err) {
    return { values, error: err instanceof Error ? err.message : "Something went wrong. Please try again." };
  }
}
