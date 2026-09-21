import "server-only";
import { db } from "@/lib/db";

const CONFIG_ID = "singleton";

export async function getAIUsageConfig() {
  return db.aIUsageConfig.upsert({ where: { id: CONFIG_ID }, update: {}, create: { id: CONFIG_ID } });
}

export async function updateAIUsageConfig(data: { dailyTokenSoftCap: number | null; costPerThousandTokensUsd: number }, updatedById: string) {
  return db.aIUsageConfig.upsert({
    where: { id: CONFIG_ID },
    update: { ...data, updatedById },
    create: { id: CONFIG_ID, ...data, updatedById },
  });
}

export interface AIUsageSummary {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  totalTokens: number;
  estimatedCostUsd: number;
  byFeature: { feature: string; requests: number; tokens: number; failures: number }[];
  byUser: { userId: string; userName: string; requests: number; tokens: number }[];
  tokensToday: number;
  dailyTokenSoftCap: number | null;
}

/** Aggregates the existing AIInteraction log (already tracks provider/model/tokens/latency/
 * success-failure since Phase 3A) into the usage rollup the spec's "AI Usage Management"
 * section asked for — no new tracking needed, this is purely a reporting layer over data
 * that already exists. */
export async function getAIUsageSummary(): Promise<AIUsageSummary> {
  const [interactions, config] = await Promise.all([
    db.aIInteraction.findMany({
      select: { feature: true, status: true, promptTokens: true, completionTokens: true, userId: true, createdAt: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    getAIUsageConfig(),
  ]);

  const tokensOf = (i: (typeof interactions)[number]) => (i.promptTokens ?? 0) + (i.completionTokens ?? 0);
  const totalTokens = interactions.reduce((s, i) => s + tokensOf(i), 0);

  const byFeatureMap = new Map<string, { requests: number; tokens: number; failures: number }>();
  const byUserMap = new Map<string, { userName: string; requests: number; tokens: number }>();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  let tokensToday = 0;

  for (const i of interactions) {
    const tokens = tokensOf(i);
    const f = byFeatureMap.get(i.feature) ?? { requests: 0, tokens: 0, failures: 0 };
    f.requests++;
    f.tokens += tokens;
    if (i.status === "FAILED") f.failures++;
    byFeatureMap.set(i.feature, f);

    if (i.userId) {
      const u = byUserMap.get(i.userId) ?? { userName: i.user?.name ?? "Unknown", requests: 0, tokens: 0 };
      u.requests++;
      u.tokens += tokens;
      byUserMap.set(i.userId, u);
    }

    if (i.createdAt >= todayStart) tokensToday += tokens;
  }

  return {
    totalRequests: interactions.length,
    successCount: interactions.filter((i) => i.status === "SUCCESS").length,
    failureCount: interactions.filter((i) => i.status === "FAILED").length,
    totalTokens,
    estimatedCostUsd: Math.round((totalTokens / 1000) * config.costPerThousandTokensUsd * 100) / 100,
    byFeature: Array.from(byFeatureMap.entries()).map(([feature, v]) => ({ feature, ...v })).sort((a, b) => b.requests - a.requests),
    byUser: Array.from(byUserMap.entries()).map(([userId, v]) => ({ userId, ...v })).sort((a, b) => b.requests - a.requests).slice(0, 10),
    tokensToday,
    dailyTokenSoftCap: config.dailyTokenSoftCap,
  };
}
