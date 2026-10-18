import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/** Zoom signs each notice with the app's Secret Token. Anything older than this is treated as a replay. */
export const WEBHOOK_MAX_AGE_SECONDS = 5 * 60;

function hmacHex(secret: string, message: string) {
  return createHmac("sha256", secret).update(message).digest("hex");
}

function sameText(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** True only for a notice that Zoom itself signed, recently, for exactly this body. */
export function verifyZoomSignature(input: { secret: string; rawBody: string; signature: string | null; timestamp: string | null; nowSeconds?: number }): boolean {
  if (!input.signature || !input.timestamp) return false;
  const sentAt = Number(input.timestamp);
  if (!Number.isFinite(sentAt)) return false;
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - sentAt) > WEBHOOK_MAX_AGE_SECONDS) return false;
  const expected = `v0=${hmacHex(input.secret, `v0:${input.timestamp}:${input.rawBody}`)}`;
  return sameText(expected, input.signature);
}

/**
 * Zoom proves it owns our address by sending a random token that we must sign back. Since this signs
 * text chosen by the caller, only a plain random-looking token is accepted: it can never be shaped
 * like a "v0:<time>:<body>" message, so the answer can't be reused to forge a real notice.
 */
const PLAIN_TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

export function answerUrlValidation(secret: string, plainToken: unknown): { plainToken: string; encryptedToken: string } | null {
  if (typeof plainToken !== "string" || !PLAIN_TOKEN.test(plainToken)) return null;
  return { plainToken, encryptedToken: hmacHex(secret, plainToken) };
}
