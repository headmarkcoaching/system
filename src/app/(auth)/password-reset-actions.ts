"use server";

import { z } from "zod";
import * as passwordResetService from "@/lib/services/password-reset";
import { checkRateLimit } from "@/lib/rate-limit";

const requestSchema = z.object({ identifier: z.string().min(3, "Enter your email or phone number.") });

export interface RequestResetState {
  error?: string;
  success?: boolean;
}

/** Always returns the same success shape whether or not an account was found, so this endpoint
 * can't be used to discover which emails/phones have accounts (see password-reset.ts). */
export async function requestPasswordResetAction(_prevState: RequestResetState, formData: FormData): Promise<RequestResetState> {
  const parsed = requestSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const rate = checkRateLimit(`forgot-password:${parsed.data.identifier.trim().toLowerCase()}`, { windowMs: 15 * 60 * 1000, max: 5 });
  if (!rate.allowed) return { error: "Too many requests. Please try again in a few minutes." };

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3200";
  try {
    await passwordResetService.requestPasswordReset(parsed.data.identifier, baseUrl);
  } catch (err) {
    console.error("requestPasswordReset failed", err);
    // Still return success — a delivery failure shouldn't leak account-existence info either,
    // and there's nothing actionable the user can do differently.
  }
  return { success: true };
}

const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, { message: "Passwords don't match.", path: ["confirmPassword"] });

export interface ResetPasswordState {
  error?: string;
  success?: boolean;
}

export async function resetPasswordAction(token: string, _prevState: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await passwordResetService.resetPassword(token, parsed.data.password);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not reset password. Please try again." };
  }
}
