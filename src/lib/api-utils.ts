import "server-only";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

export function apiError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export interface Pagination {
  page: number;
  pageSize: number;
}

/** Shared pagination convention for every /api/v1/* endpoint — capped at 100/page so a caller
 * can never force an unbounded query ("avoid loading large datasets unnecessarily" per the
 * spec's Performance Optimization section). */
export function parsePagination(searchParams: URLSearchParams): Pagination {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
  return { page, pageSize };
}

export function paginatedResponse<T>(data: T[], pagination: Pagination, total: number) {
  return NextResponse.json({
    data,
    pagination: { page: pagination.page, pageSize: pagination.pageSize, total, totalPages: Math.ceil(total / pagination.pageSize) },
  });
}

function hashKey(rawKey: string) {
  return createHash("sha256").update(rawKey).digest("hex");
}

/** Bearer-token auth for /api/v1/* — a separate credential from a user session, since the
 * caller here is a future mobile app/external integration, not a logged-in browser. Every call
 * is also rate-limited per key, independent of the login rate limiter above. */
export async function requireApiKey(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return { error: apiError(401, "Missing Authorization: Bearer <key> header.") };

  const rawKey = auth.slice("Bearer ".length).trim();
  const keyHash = hashKey(rawKey);
  const apiKey = await db.apiKey.findUnique({ where: { keyHash } });
  if (!apiKey || apiKey.revokedAt) return { error: apiError(401, "Invalid or revoked API key.") };

  const rate = checkRateLimit(`api:${apiKey.id}`, { windowMs: 60_000, max: 60 });
  if (!rate.allowed) return { error: apiError(429, "Rate limit exceeded — 60 requests per minute per key.") };

  db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { apiKey };
}
