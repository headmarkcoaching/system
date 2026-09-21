import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { getSystemHealthSummary } from "@/lib/services/system-health";

export default async function SystemHealthPage() {
  const data = await getSystemHealthSummary();

  return (
    <div className="space-y-6">
      <PageHeader title="System Health" description="Background jobs, automation, integrations, and delivery — all in one place." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrations</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {data.integrations.map((i) => (
            <div key={i.name} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <span>{i.name}</span>
              <Badge variant={i.isRealProvider ? "success" : "secondary"}>{i.provider}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${data.failedJobs24h > 0 ? "text-destructive" : ""}`}>{data.failedJobs24h}</p>
            <p className="text-xs text-muted-foreground">Failed Jobs (24h)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${data.failedAutomation24h > 0 ? "text-destructive" : ""}`}>{data.failedAutomation24h}</p>
            <p className="text-xs text-muted-foreground">Automation Failures (24h)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${data.whatsappFailures24h > 0 ? "text-destructive" : ""}`}>{data.whatsappFailures24h}</p>
            <p className="text-xs text-muted-foreground">Message Failures (24h)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${data.aiFailureRate24h > 10 ? "text-destructive" : ""}`}>{data.aiFailureRate24h}%</p>
            <p className="text-xs text-muted-foreground">AI Failure Rate (24h)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest Run Per Job</CardTitle>
        </CardHeader>
        <CardContent>
          {data.latestPerJob.length === 0 ? (
            <EmptyState title="No jobs have run yet" description="Run npm run jobs:run, or wait for the scheduler." className="py-6" />
          ) : (
            <ul className="space-y-1.5 text-sm">
              {data.latestPerJob.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span>{r.jobKey}</span>
                  <span className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-muted-foreground">{formatDate(r.startedAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Job Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentJobRuns.length === 0 ? (
            <EmptyState title="No job runs recorded yet" className="py-6" />
          ) : (
            <ul className="space-y-1.5 text-sm">
              {data.recentJobRuns.map((r) => (
                <li key={r.id} className="rounded-md border border-border px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.jobKey}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {formatDate(r.startedAt)} · {r.itemsProcessed != null ? `${r.itemsProcessed} processed` : "—"}
                    </span>
                    {r.errorMessage && <span className="text-destructive">{r.errorMessage}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
