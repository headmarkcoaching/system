import "server-only";
import { db } from "@/lib/db";

// Sliding-window limiter backed by the database, so every server instance shares one count. The
// earlier in-memory version reset on each serverless cold start and was invisible to other
// instances, which made login and public-form limits easy to sidestep once deployed. If the
// database can't be reached the limiter falls back to this instance's memory rather than
// failing open entirely.
const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

type Options = { windowMs: number; max: number };

function checkInMemory(key: string, options: Options): RateLimitResult {
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

const PURGE_AFTER_MS = 24 * 60 * 60 * 1000;

export async function checkRateLimit(key: string, options: Options): Promise<RateLimitResult> {
  try {
    const now = Date.now();
    const windowStart = new Date(now - options.windowMs);

    const recent = await db.rateLimitHit.findMany({
      where: { key, createdAt: { gt: windowStart } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
      take: options.max,
    });

    if (recent.length >= options.max) {
      const retryAfterMs = Math.max(0, recent[0].createdAt.getTime() + options.windowMs - now);
      return { allowed: false, remaining: 0, retryAfterMs };
    }

    await db.rateLimitHit.create({ data: { key } });

    // Housekeeping: now and then, drop rows too old to matter for any window we use.
    if (Math.random() < 0.02) {
      db.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(now - PURGE_AFTER_MS) } } }).catch(() => {});
    }

    return { allowed: true, remaining: options.max - recent.length - 1 };
  } catch (err) {
    console.error("rate limit store unavailable, using in-memory fallback", err);
    return checkInMemory(key, options);
  }
}
