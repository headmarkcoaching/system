import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireApiKey, parsePagination, paginatedResponse } from "@/lib/api-utils";

/** Demonstrates the documented API conventions (Bearer API-key auth, pagination, filtering)
 * the spec asked for in preparation for a future mobile app/external integration — one
 * representative endpoint, not a full REST surface for every entity. Extending this pattern to
 * more resources is a mechanical follow-up once a real external consumer needs it. */
export async function GET(request: NextRequest) {
  const auth = await requireApiKey(request);
  if ("error" in auth) return auth.error;

  const searchParams = request.nextUrl.searchParams;
  const pagination = parsePagination(searchParams);
  const status = searchParams.get("status");
  const academicLevelId = searchParams.get("academicLevelId");

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(academicLevelId ? { academicLevelId } : {}),
  };

  const [items, total] = await Promise.all([
    db.student.findMany({
      where,
      select: { id: true, studentCode: true, fullName: true, status: true, academicLevel: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
    db.student.count({ where }),
  ]);

  return paginatedResponse(items, pagination, total);
}

export const dynamic = "force-dynamic";
