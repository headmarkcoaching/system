import "server-only";
import { db } from "@/lib/db";

export function listRecentJobRuns(limit = 50) {
  return db.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: limit });
}

export async function latestRunPerJob() {
  const all = await db.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 200 });
  const seen = new Set<string>();
  return all.filter((r) => {
    if (seen.has(r.jobKey)) return false;
    seen.add(r.jobKey);
    return true;
  });
}
