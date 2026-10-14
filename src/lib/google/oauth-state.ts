import "server-only";
import crypto from "crypto";

// The "state" value that protects the Google connect flow from forged callbacks. It used to be a
// random value kept in a cookie and compared on return, which failed whenever the cookie didn't
// make the round trip (a double click, a second tab, a browser that dropped it). Instead the value
// is signed: it carries who started the flow and an expiry, and only this server can have made it
// (the signature uses AUTH_SECRET). A callback that was not started by the signed-in Super Admin
// within the last 15 minutes is refused, and nothing has to be stored.
const TTL_MS = 15 * 60 * 1000;

function key(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET must be set");
  return crypto.createHash("sha256").update(`google-oauth-state:${secret}`).digest();
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", key()).update(payload).digest("base64url");
}

export function createOAuthState(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, e: Date.now() + TTL_MS, n: crypto.randomBytes(8).toString("hex") })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyOAuthState(state: string | null | undefined, userId: string): boolean {
  if (!state) return false;
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as { u?: string; e?: number };
    return data.u === userId && typeof data.e === "number" && data.e > Date.now();
  } catch {
    return false;
  }
}
