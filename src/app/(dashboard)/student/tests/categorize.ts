import type * as testService from "@/lib/services/tests";

export function categorizeTest(test: Awaited<ReturnType<typeof testService.listTestsForStudent>>[number]) {
  const now = new Date();
  if (test.result?.gradedAt) return "completed" as const;
  if (test.attempt?.submittedAt) return "awaiting" as const;
  if (test.status === "ACTIVE" && now >= test.startDate && now <= test.endDate) return "available" as const;
  if (now < test.startDate || test.status === "SCHEDULED") return "upcoming" as const;
  return "closed" as const;
}
