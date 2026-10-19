import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { getSystemHealthSummary } from "@/lib/services/system-health";
import { RetryRecordingButton } from "./retry-recording-button";

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
          <CardTitle className="text-base">Blocked Contact Sharing (last 7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.blockedContactShares.length === 0 ? (
            <EmptyState title="Nothing blocked" description="If a teacher, student or parent tries to send a phone number, email or messaging-app invite in a message, doubt or announcement, it is refused and listed here." className="py-6" />
          ) : (
            <ul className="space-y-1.5 text-sm">
              {data.blockedContactShares.map((b) => {
                const info = (b.after ?? {}) as { channel?: string; text?: string };
                return (
                  <li key={b.id} className="rounded-md border border-border px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{b.actor?.name ?? "Unknown"}</span>
                      <Badge variant="secondary">{info.channel ?? "Message"}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(b.createdAt)}
                      {info.text ? <span className="block break-words pt-0.5">&ldquo;{info.text}&rdquo;</span> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Class Join Alerts (last 7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.joinAlerts.length === 0 ? (
            <EmptyState title="Nothing unusual" description="Strangers, shared links and students with lapsed fees who try to join a Zoom class are listed here." className="py-6" />
          ) : (
            <ul className="space-y-1.5 text-sm">
              {data.joinAlerts.map((a) => (
                <li key={a.id} className="rounded-md border border-border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{a.displayName}</span>
                    <Badge variant={a.kind === "DUPLICATE" ? "secondary" : "destructive"}>
                      {a.kind === "UNKNOWN" ? "Not registered" : a.kind === "REVOKED" ? "Access lapsed" : "Second device"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.liveClass.title} · {a.liveClass.batch.name} · {formatDate(a.joinedAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Class Recordings (Zoom to Drive)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recordingJobs.length === 0 ? (
            <EmptyState title="No recordings yet" description="After a Zoom class ends, its recording is copied into Google Drive automatically and shows up here." className="py-6" />
          ) : (
            <ul className="space-y-1.5 text-sm">
              {data.recordingJobs.map((j) => (
                <li key={j.id} className="rounded-md border border-border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {j.liveClass?.title ?? "Unknown class"}
                      {j.liveClass?.batch.name ? <span className="font-normal text-muted-foreground"> · {j.liveClass.batch.name}</span> : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={j.status} />
                      {(j.status === "FAILED" || j.status === "SKIPPED") && j.liveClassId ? <RetryRecordingButton jobId={j.id} /> : null}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {formatDate(j.createdAt)} · tried {j.attempts} {j.attempts === 1 ? "time" : "times"}
                    </span>
                    {j.lastError && <span className="text-destructive">{j.lastError}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
