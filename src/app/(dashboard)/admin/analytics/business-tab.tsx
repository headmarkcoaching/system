import { StatCard } from "@/components/shared/stat-card";
import { TrendLineChart } from "@/components/shared/charts/trend-line-chart";
import { SimpleBarChart } from "@/components/shared/charts/simple-bar-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/utils";
import { Users, GraduationCap, TrendingUp, Wallet, DollarSign, UserCheck } from "lucide-react";
import type { businessMetrics, leadFunnel } from "@/lib/services/analytics";

function stageLabel(stage: string) {
  return stage
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function BusinessTab({ metrics, funnel }: { metrics: Awaited<ReturnType<typeof businessMetrics>>; funnel: Awaited<ReturnType<typeof leadFunnel>> }) {
  const funnelData = funnel.stages.map((s) => ({ stage: stageLabel(s.stage), reached: s.reachedCount, current: s.currentCount, conversionPercent: s.conversionPercent }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total Leads" value={metrics.totalLeads} icon={Users} />
        <StatCard label="Total Trials" value={metrics.totalTrials} icon={UserCheck} />
        <StatCard label="Total Enrollments" value={metrics.totalEnrollments} icon={GraduationCap} />
        <StatCard label="Conversion Rate" value={`${metrics.conversionRate}%`} icon={TrendingUp} />
        <StatCard label="Collected This Month" value={formatPKR(metrics.collectedThisMonth)} icon={DollarSign} tone="success" />
        <StatCard label="Outstanding Payments" value={formatPKR(metrics.outstandingPayments)} icon={Wallet} tone="warning" />
        <StatCard label="Expected Revenue" value={formatPKR(metrics.expectedRevenue)} icon={Wallet} />
        <StatCard label="Retention Rate" value={`${metrics.retentionRate}%`} icon={TrendingUp} tone={metrics.retentionRate >= 80 ? "success" : metrics.retentionRate >= 60 ? "warning" : "destructive"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead Funnel</CardTitle>
          <CardDescription>
            % of leads that reached each stage or further ({funnel.totalActive} active leads, {funnel.lost} lost). Reached counts are inferred from each lead&apos;s current stage, since only the current stage is tracked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleBarChart data={funnelData} xKey="stage" yKey="reached" color="hsl(var(--primary))" height={280} horizontal />
          <div className="mt-3 flex flex-wrap gap-2">
            {funnelData.map((s) => (
              <Badge key={s.stage} variant="outline">
                {s.stage}: {s.current} now · {s.conversionPercent}% reached
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Revenue (last 7 months)</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendLineChart data={metrics.monthlyRevenue} xKey="month" series={[{ key: "amount", label: "Revenue (PKR)", color: "hsl(var(--primary))" }]} />
        </CardContent>
      </Card>
    </div>
  );
}
