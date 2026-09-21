import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import * as aiUsageService from "@/lib/services/ai-usage";
import { Sparkles, AlertTriangle, Zap } from "lucide-react";
import { ConfigForm } from "./config-form";

export default async function AIUsagePage() {
  const [summary, config] = await Promise.all([aiUsageService.getAIUsageSummary(), aiUsageService.getAIUsageConfig()]);

  const overCap = config.dailyTokenSoftCap != null && summary.tokensToday > config.dailyTokenSoftCap;

  return (
    <div className="space-y-6">
      <PageHeader title="AI Usage" description="Every AI call across the platform, aggregated by feature and user — last 5,000 interactions." />

      {overCap && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Today&apos;s token usage ({summary.tokensToday.toLocaleString()}) has exceeded the configured soft cap ({config.dailyTokenSoftCap?.toLocaleString()}). This is informational only — no requests are being blocked.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Requests" value={summary.totalRequests} icon={Sparkles} />
        <StatCard label="Total Tokens" value={summary.totalTokens.toLocaleString()} icon={Zap} />
        <StatCard label="Failures" value={summary.failureCount} icon={AlertTriangle} tone={summary.failureCount > 0 ? "destructive" : "success"} />
        <StatCard label="Est. Cost" value={summary.estimatedCostUsd > 0 ? `$${summary.estimatedCostUsd}` : "—"} icon={Sparkles} hint={summary.estimatedCostUsd === 0 ? "Set a cost/1k tokens below" : undefined} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost Controls (informational)</CardTitle>
        </CardHeader>
        <CardContent>
          <ConfigForm dailyTokenSoftCap={config.dailyTokenSoftCap} costPerThousandTokensUsd={config.costPerThousandTokensUsd} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Feature</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.byFeature.length === 0 ? (
              <EmptyState title="No AI usage yet" className="py-6" />
            ) : (
              <ul className="space-y-1.5 text-sm">
                {summary.byFeature.map((f) => (
                  <li key={f.feature} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <span>{f.feature.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">
                      {f.requests} req · {f.tokens.toLocaleString()} tok{f.failures > 0 ? ` · ${f.failures} failed` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By User (top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.byUser.length === 0 ? (
              <EmptyState title="No AI usage yet" className="py-6" />
            ) : (
              <ul className="space-y-1.5 text-sm">
                {summary.byUser.map((u) => (
                  <li key={u.userId} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <span>{u.userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {u.requests} req · {u.tokens.toLocaleString()} tok
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
