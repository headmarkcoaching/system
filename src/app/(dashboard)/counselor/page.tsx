import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCounselorRecordForUser } from "@/lib/access";
import * as leadService from "@/lib/services/leads";
import * as analyticsService from "@/lib/services/analytics";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Users, UserPlus, CalendarClock, Wallet, Hourglass } from "lucide-react";

export default async function CounselorDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const counselor = await getCounselorRecordForUser(session.user.id);
  if (!counselor) {
    return <EmptyState title="No counselor profile found" description="Ask an admin to link your account to a counselor profile." />;
  }

  const [pipeline, funnel, followupsDue, recentLeads, trialsEndingSoon] = await Promise.all([
    leadService.pipelineSummary(counselor.id),
    analyticsService.leadFunnel(counselor.id),
    leadService.listFollowupsDue(counselor.id),
    leadService.listLeads({ counselorId: counselor.id }),
    leadService.listTrialsEndingSoon(counselor.id),
  ]);

  const totalLeads = pipeline.reduce((sum, p) => sum + p.count, 0);
  const enrolled = pipeline.find((p) => p.stage === "ENROLLED")?.count ?? 0;
  const paymentPending = pipeline.find((p) => p.stage === "PAYMENT_PENDING")?.count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${session.user.name.split(" ")[0]}`} description="Which lead should you follow up with?" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="My Leads" value={totalLeads} icon={Users} />
        <StatCard label="Follow-ups Due" value={followupsDue.length} icon={CalendarClock} tone={followupsDue.length > 0 ? "warning" : "default"} />
        <StatCard label="Enrolled" value={enrolled} icon={UserPlus} tone="success" />
        <StatCard label="Payment Pending" value={paymentPending} icon={Wallet} tone={paymentPending > 0 ? "warning" : "default"} />
        <StatCard label="Trials Ending Soon" value={trialsEndingSoon.length} icon={Hourglass} tone={trialsEndingSoon.length > 0 ? "warning" : "default"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {funnel.stages.map((s) => (
              <Badge key={s.stage} variant="outline">
                {s.stage.replace(/_/g, " ")}: {s.currentCount} · {s.conversionPercent}% reached
              </Badge>
            ))}
            {funnel.lost > 0 && <Badge variant="destructive">Lost: {funnel.lost}</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trials Ending Soon</CardTitle>
        </CardHeader>
        <CardContent>
          {trialsEndingSoon.length === 0 ? (
            <EmptyState title="No trials ending in the next few days" className="py-8" />
          ) : (
            <ul className="space-y-2">
              {trialsEndingSoon.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <Link href={`/leads/${t.leadId}`} className="min-w-0">
                    <p className="truncate font-medium hover:underline">{t.lead.studentName}</p>
                    <p className="text-xs text-muted-foreground">Ends {formatDate(t.endDate)}</p>
                  </Link>
                  <Badge variant="outline">{t.batch?.name ?? "—"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Follow-Ups Due Today &amp; Overdue</CardTitle>
        </CardHeader>
        <CardContent>
          {followupsDue.length === 0 ? (
            <EmptyState title="Nothing due — nice work" className="py-8" />
          ) : (
            <ul className="space-y-2">
              {followupsDue.map((f) => (
                <li key={f.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <Link href={`/leads/${f.leadId}`} className="min-w-0">
                    <p className="truncate font-medium hover:underline">{f.lead.studentName}</p>
                    <p className="text-xs text-muted-foreground">Due {formatDate(f.dueDate)}</p>
                  </Link>
                  <Badge variant={f.dueDate < new Date() ? "destructive" : "outline"}>{f.dueDate < new Date() ? "Overdue" : "Today"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLeads.items.length === 0 ? (
            <EmptyState title="No leads assigned yet" className="py-8" />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {recentLeads.items.slice(0, 6).map((l) => (
                <li key={l.id}>
                  <Link href={`/leads/${l.id}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
                    <span className="font-medium">{l.studentName}</span>
                    <Badge variant="outline">{l.stage.replace(/_/g, " ")}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/counselor/leads" className="mt-3 block text-center text-sm text-primary hover:underline">
            View all leads
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
