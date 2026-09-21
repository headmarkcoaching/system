import "server-only";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import * as emailService from "@/lib/services/email";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** Always call this for both "account found" and "not found" — never let the caller distinguish
 * the two outcomes, or the endpoint becomes a way to enumerate which emails/phones have accounts. */
export async function requestPasswordReset(identifier: string, baseUrl: string) {
  const user = await db.user.findFirst({
    where: { OR: [{ email: identifier.trim() }, { phone: identifier.trim() }], isActive: true },
  });

  // No account, or an account with no email on file (a phone-only login, e.g. many parents) —
  // there's no delivery channel for a reset link, so silently no-op. The caller shows the same
  // generic confirmation regardless.
  if (!user?.email) return;

  const rawToken = randomBytes(32).toString("hex");
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  const resetUrl = `${baseUrl}/reset-password/${rawToken}`;
  await emailService.sendMessage({
    recipientEmail: user.email,
    recipientUserId: user.id,
    subject: "Reset your Head Mark Coaching password",
    body: `Hi ${user.name},\n\nSomeone requested a password reset for your account. If this was you, set a new password here (link expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email — your password hasn't been changed.`,
  });
}

export async function verifyResetToken(rawToken: string) {
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;
  return record;
}

export class InvalidResetTokenError extends Error {}

export async function resetPassword(rawToken: string, newPassword: string) {
  const record = await verifyResetToken(rawToken);
  if (!record) throw new InvalidResetTokenError("This reset link is invalid or has expired. Please request a new one.");

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Defense in depth: invalidate any other outstanding reset tokens for this user too, so an
    // old, forgotten link can't still be used after the password has already been changed.
    db.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      data: { usedAt: new Date() },
    }),
  ]);
}
