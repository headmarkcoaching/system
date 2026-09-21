import "server-only";

// In-memory sliding-window limiter — a real, working foundation for login-brute-force and
// API-abuse protection, not a placeholder. Known limitation (documented in PHASE_COMPLETION.md):
// state lives in this one Node process's memory, so it resets on redeploy/restart and does not
// share state across multiple server instances — a real multi-instance production deployment
// would need a shared store (Redis/Upstash) behind the same checkRateLimit() signature.
const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export function checkRateLimit(key: string, options: { windowMs: number; max: number }): RateLimitResult {
  const now = Date.now();
  const windowStart = now - options.windowMs;
  const timestamps = (buckets.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= options.max) {
    const retryAfterMs = timestamps[0] + options.windowMs - now;
    buckets.set(key, timestamps);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true, remaining: options.max - timestamps.length };
}
