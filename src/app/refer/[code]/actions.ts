"use server";

import { z } from "zod";
import * as referralsService from "@/lib/services/referrals";
import { checkRateLimit } from "@/lib/rate-limit";

const referralSchema = z.object({
  studentName: z.string().min(2, "Student name is required"),
  parentName: z.string().min(2, "Parent name is required"),
  parentPhone: z.string().min(7, "A valid phone number is required"),
  academicLevelId: z.string().optional(),
});

export interface SubmitReferralState {
  error?: string;
  success?: boolean;
}

export async function submitReferralAction(code: string, _prevState: SubmitReferralState, formData: FormData): Promise<SubmitReferralState> {
  const parsed = referralSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Same reasoning as /enroll: a public, unauthenticated form needs abuse protection.
  const phoneRate = checkRateLimit(`referral:phone:${parsed.data.parentPhone.replace(/\D/g, "")}`, { windowMs: 60 * 60 * 1000, max: 3 });
  if (!phoneRate.allowed) return { error: "You've already submitted recently. Our team will be in touch shortly." };
  const globalRate = checkRateLimit("referral:global", { windowMs: 5 * 60 * 1000, max: 30 });
  if (!globalRate.allowed) return { error: "Something went wrong. Please try again in a few minutes." };

  try {
    await referralsService.createReferralFromCode({
      code,
      ...parsed.data,
      academicLevelId: parsed.data.academicLevelId || undefined,
    });
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong. Please try again." };
  }
}
